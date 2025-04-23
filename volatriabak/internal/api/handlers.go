package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/klea/volatria/volatria/internal/database"
)

type Handler struct {
	db *database.Database
}

type CacheEntry struct {
	Data      interface{}
	Timestamp time.Time
}

var (
	priceCache = make(map[string]CacheEntry)
	chartCache = make(map[string]CacheEntry)
	cacheTTL   = 5 * time.Minute // Cache data for 5 minutes
)

func New(db *database.Database) *Handler {
	return &Handler{db: db}
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
	if entry, exists := priceCache[symbol]; exists {
		if time.Since(entry.Timestamp) < cacheTTL {
			c.JSON(http.StatusOK, entry.Data)
			return
		}
	}

	price, err := h.db.GetLatestPrice(symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Cache the result
	priceCache[symbol] = CacheEntry{
		Data:      gin.H{"symbol": symbol, "price": price},
		Timestamp: time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{"symbol": symbol, "price": price})
}

func (h *Handler) GetHistoricalPrices(c *gin.Context) {
	symbol := c.Param("symbol")
	rangeParam := c.DefaultQuery("range", "7d")

	// Check cache first
	cacheKey := fmt.Sprintf("%s_%s", symbol, rangeParam)
	if entry, exists := chartCache[cacheKey]; exists {
		if time.Since(entry.Timestamp) < cacheTTL {
			c.JSON(http.StatusOK, entry.Data)
			return
		}
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
	chartCache[cacheKey] = CacheEntry{
		Data:      gin.H{"symbol": symbol, "prices": formattedPrices},
		Timestamp: time.Now(),
	}

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

func (h *Handler) GetPopularStocks(c *gin.Context) {
	// List of different stocks to track
	popularStocks := []string{"NVDA", "AMD", "INTC", "IBM", "ORCL", "CSCO", "ADBE", "CRM", "AVGO", "QCOM"}

	var stocks []struct {
		Symbol string  `json:"symbol"`
		Price  float64 `json:"price"`
	}

	for _, symbol := range popularStocks {
		price, err := h.db.GetLatestPrice(symbol)
		if err == nil {
			stocks = append(stocks, struct {
				Symbol string  `json:"symbol"`
				Price  float64 `json:"price"`
			}{
				Symbol: symbol,
				Price:  price,
			})
		}
	}

	// Ensure we always return a valid JSON array, even if empty
	if stocks == nil {
		stocks = make([]struct {
			Symbol string  `json:"symbol"`
			Price  float64 `json:"price"`
		}, 0)
	}

	c.JSON(http.StatusOK, stocks)
}
