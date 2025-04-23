package api

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/klea/volatria/volatria/internal/database"
)

type CacheEntry struct {
	Data      interface{}
	Timestamp time.Time
}

type CacheMetrics struct {
	Hits   int64
	Misses int64
	mu     sync.Mutex
}

func (m *CacheMetrics) RecordHit() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Hits++
}

func (m *CacheMetrics) RecordMiss() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Misses++
}

type Cache struct {
	entries map[string]CacheEntry
	mu      sync.RWMutex
	ttl     time.Duration
	metrics *CacheMetrics
	maxSize int
}

func NewCache(ttl time.Duration, maxSize int) *Cache {
	c := &Cache{
		entries: make(map[string]CacheEntry),
		ttl:     ttl,
		metrics: &CacheMetrics{},
		maxSize: maxSize,
	}

	// Start background cleanup
	go c.cleanup()

	return c
}

func (c *Cache) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.entries {
			if now.Sub(entry.Timestamp) > c.ttl {
				delete(c.entries, key)
			}
		}
		c.mu.Unlock()
	}
}

func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.entries[key]
	if !exists || time.Since(entry.Timestamp) > c.ttl {
		c.metrics.RecordMiss()
		return nil, false
	}
	c.metrics.RecordHit()
	return entry.Data, true
}

func (c *Cache) Set(key string, data interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Remove oldest entry if cache is full
	if len(c.entries) >= c.maxSize {
		var oldestKey string
		var oldestTime time.Time
		for key, entry := range c.entries {
			if oldestTime.IsZero() || entry.Timestamp.Before(oldestTime) {
				oldestKey = key
				oldestTime = entry.Timestamp
			}
		}
		delete(c.entries, oldestKey)
	}

	c.entries[key] = CacheEntry{
		Data:      data,
		Timestamp: time.Now(),
	}
}

func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]CacheEntry)
}

type StockResponse struct {
	Symbol    string  `json:"symbol"`
	Price     float64 `json:"price"`
	Timestamp string  `json:"timestamp"`
}

type HistoricalResponse struct {
	Symbol string  `json:"symbol"`
	Prices []Price `json:"prices"`
}

type Price struct {
	Price     float64 `json:"price"`
	Timestamp string  `json:"timestamp"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

var (
	popularStocks = []string{"AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AMD", "INTC", "SQ"}
	globalCache   = NewCache(5*time.Minute, 100)
)

type Handler struct {
	db    *database.Database
	cache *Cache
}

func New(db *database.Database) *Handler {
	return &Handler{
		db:    db,
		cache: NewCache(5*time.Minute, 100),
	}
}

func (h *Handler) Login(c *gin.Context) {
	var request struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := h.db.AuthenticateUser(request.Username, request.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"userID": user.ID})
}

func (h *Handler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetHeader("X-User-ID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

func (h *Handler) GetLatestPrice(c *gin.Context) {
	symbol := c.Param("symbol")

	// Check cache first
	if entry, exists := h.cache.Get(symbol); exists {
		c.JSON(http.StatusOK, entry)
		return
	}

	price, err := h.db.GetLatestPrice(symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Cache the result
	h.cache.Set(symbol, gin.H{"symbol": symbol, "price": price})

	c.JSON(http.StatusOK, gin.H{"symbol": symbol, "price": price})
}

func (h *Handler) GetHistoricalPrices(c *gin.Context) {
	symbol := c.Param("symbol")
	rangeParam := c.DefaultQuery("range", "7d")

	// Check cache first
	cacheKey := fmt.Sprintf("%s_%s", symbol, rangeParam)
	if entry, exists := h.cache.Get(cacheKey); exists {
		c.JSON(http.StatusOK, entry)
		return
	}

	// Parse range parameter
	end := time.Now()
	var start time.Time
	switch rangeParam {
	case "7d":
		start = end.AddDate(0, 0, -7)
	case "1m":
		start = end.AddDate(0, -1, 0)
	case "1y":
		start = end.AddDate(-1, 0, 0)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid range parameter"})
		return
	}

	prices, err := h.db.GetHistoricalPrices(symbol, start, end)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Format the response with proper timestamps
	formattedPrices := make([]gin.H, len(prices))
	for i, price := range prices {
		formattedPrices[i] = gin.H{
			"symbol":    price.Symbol,
			"price":     price.Price,
			"timestamp": price.Timestamp.Format(time.RFC3339),
		}
	}

	// Cache the result
	h.cache.Set(cacheKey, gin.H{"symbol": symbol, "prices": formattedPrices})

	c.JSON(http.StatusOK, gin.H{"symbol": symbol, "prices": formattedPrices})
}

func (h *Handler) AddToWatchlist(c *gin.Context) {
	userIDStr := c.GetHeader("X-User-ID")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var request struct {
		Symbol string `json:"symbol" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.db.AddToWatchlist(userID, request.Symbol); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to watchlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Symbol added to watchlist"})
}

func (h *Handler) GetWatchlist(c *gin.Context) {
	userID := c.GetInt("userID")
	stocks, err := h.db.GetWatchlist(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch watchlist"})
		return
	}

	c.JSON(http.StatusOK, stocks)
}

func (h *Handler) ValidateStockSymbol() gin.HandlerFunc {
	return func(c *gin.Context) {
		symbol := c.Query("symbol")
		if symbol == "" {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Symbol is required"})
			c.Abort()
			return
		}
		if len(symbol) > 10 {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Symbol too long"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func (h *Handler) GetStock(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	symbol := c.Query("symbol")

	// Check cache first
	if cached, ok := h.cache.Get(symbol); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	price, err := h.db.GetLatestPrice(symbol)
	if err != nil {
		select {
		case <-ctx.Done():
			c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timed out"})
		default:
			c.JSON(http.StatusNotFound, ErrorResponse{Error: fmt.Sprintf("Stock not found: %v", err)})
		}
		return
	}

	response := StockResponse{
		Symbol:    symbol,
		Price:     price,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	h.cache.Set(symbol, response)
	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetPopularStocks(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	responses := make([]StockResponse, len(popularStocks))
	errors := make([]error, len(popularStocks))

	for i, symbol := range popularStocks {
		select {
		case <-ctx.Done():
			c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timed out"})
			return
		default:
			wg.Add(1)
			go func(i int, symbol string) {
				defer wg.Done()

				// Check cache first
				if cached, ok := h.cache.Get(symbol); ok {
					responses[i] = cached.(StockResponse)
					return
				}

				price, err := h.db.GetLatestPrice(symbol)
				if err != nil {
					errors[i] = fmt.Errorf("failed to fetch %s: %v", symbol, err)
					return
				}

				response := StockResponse{
					Symbol:    symbol,
					Price:     price,
					Timestamp: time.Now().Format(time.RFC3339),
				}

				h.cache.Set(symbol, response)
				responses[i] = response
			}(i, symbol)
		}
	}

	wg.Wait()

	// Filter out any errors and log them
	validResponses := make([]StockResponse, 0, len(popularStocks))
	for i, response := range responses {
		if errors[i] != nil {
			fmt.Printf("Error fetching stock: %v\n", errors[i])
			continue
		}
		validResponses = append(validResponses, response)
	}

	c.JSON(http.StatusOK, validResponses)
}

func (h *Handler) GetHistoricalData(c *gin.Context) {
	symbol := c.Query("symbol")
	rangeParam := c.Query("range")

	if symbol == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Symbol is required"})
		return
	}

	var start, end time.Time
	now := time.Now()

	switch rangeParam {
	case "7d":
		start = now.AddDate(0, 0, -7)
		end = now
	case "1m":
		start = now.AddDate(0, -1, 0)
		end = now
	case "1y":
		start = now.AddDate(-1, 0, 0)
		end = now
	default:
		// Default to 1 year if range is not specified
		start = now.AddDate(-1, 0, 0)
		end = now
	}

	stocks, err := h.db.GetHistoricalPrices(symbol, start, end)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Historical data not found"})
		return
	}

	prices := make([]Price, len(stocks))
	for i, stock := range stocks {
		prices[i] = Price{
			Price:     stock.Price,
			Timestamp: stock.Timestamp.Format(time.RFC3339),
		}
	}

	response := HistoricalResponse{
		Symbol: symbol,
		Prices: prices,
	}

	c.JSON(http.StatusOK, response)
}

// Add metrics endpoint
func (h *Handler) GetMetrics(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"cache_hits":   h.cache.metrics.Hits,
		"cache_misses": h.cache.metrics.Misses,
		"hit_rate":     float64(h.cache.metrics.Hits) / float64(h.cache.metrics.Hits+h.cache.metrics.Misses),
	})
}

// Start a background goroutine to periodically clear the cache
func init() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			globalCache.Clear()
		}
	}()
}
