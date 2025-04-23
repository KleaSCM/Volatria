package fetcher

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
	"unicode"

	"github.com/klea/volatria/volatria/internal/database"
	"golang.org/x/time/rate"
)

const (
	apiKey     = "d04bbfpr01qm4vp6enf0d04bbfpr01qm4vp6enfg"
	apiBaseURL = "https://www.alphavantage.co/query"
)

type FetcherError struct {
	Symbol string
	Err    error
}

func (e *FetcherError) Error() string {
	return fmt.Sprintf("error fetching %s: %v", e.Symbol, e.Err)
}

type FetcherMetrics struct {
	TotalRequests     int64
	FailedRequests    int64
	SuccessfulFetches int64
	mu                sync.Mutex
}

type Config struct {
	APIKey            string
	BaseURL           string
	FetchInterval     time.Duration
	RequestTimeout    time.Duration
	MaxConcurrent     int
	RateLimitPerSec   int
	RetryCount        int
	RetryDelay        time.Duration
	HistoricalTimeout time.Duration
}

type Fetcher struct {
	db         *database.Database
	ticker     *time.Ticker
	done       chan struct{}
	lastPrices map[string]float64
	client     *http.Client
	limiter    *rate.Limiter
	metrics    *FetcherMetrics
	config     *Config
	isRunning  bool
	mu         sync.RWMutex
}

type AlphaVantageResponse struct {
	GlobalQuote struct {
		Symbol string `json:"01. symbol"`
		Price  string `json:"05. price"`
	} `json:"Global Quote"`
}

type HistoricalDataResponse struct {
	TimeSeriesDaily map[string]struct {
		Close string `json:"4. close"`
	} `json:"Time Series (Daily)"`
}

func New(db *database.Database, config *Config) *Fetcher {
	if config == nil {
		config = &Config{
			APIKey:            apiKey,
			BaseURL:           apiBaseURL,
			FetchInterval:     1 * time.Minute,
			RequestTimeout:    10 * time.Second,
			MaxConcurrent:     5,
			RateLimitPerSec:   5,
			RetryCount:        3,
			RetryDelay:        100 * time.Millisecond,
			HistoricalTimeout: 5 * time.Minute,
		}
	}

	return &Fetcher{
		db:         db,
		ticker:     time.NewTicker(config.FetchInterval),
		done:       make(chan struct{}),
		lastPrices: make(map[string]float64),
		client: &http.Client{
			Timeout: config.RequestTimeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				IdleConnTimeout:     90 * time.Second,
				DisableCompression:  true,
				MaxConnsPerHost:     10,
				MaxIdleConnsPerHost: 10,
			},
		},
		limiter: rate.NewLimiter(rate.Every(time.Second/time.Duration(config.RateLimitPerSec)), 1),
		metrics: &FetcherMetrics{},
		config:  config,
	}
}

func (f *Fetcher) Start() error {
	f.mu.Lock()
	if f.isRunning {
		f.mu.Unlock()
		return fmt.Errorf("fetcher already running")
	}
	f.isRunning = true
	f.mu.Unlock()

	f.fetchHistoricalData()
	f.fetchPrices()

	go func() {
		for {
			select {
			case <-f.ticker.C:
				f.fetchPrices()
			case <-f.done:
				f.ticker.Stop()
				return
			}
		}
	}()

	return nil
}

func (f *Fetcher) Stop() error {
	f.mu.Lock()
	if !f.isRunning {
		f.mu.Unlock()
		return fmt.Errorf("fetcher not running")
	}
	f.isRunning = false
	f.mu.Unlock()

	close(f.done)
	return nil
}

func (f *Fetcher) IsRunning() bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.isRunning
}

func (f *Fetcher) HealthCheck() error {
	if !f.IsRunning() {
		return fmt.Errorf("fetcher not running")
	}

	// Test a simple stock fetch
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := f.fetchStockPriceWithContext(ctx, "AAPL")
	return err
}

func isValidStockSymbol(symbol string) bool {
	if len(symbol) < 1 || len(symbol) > 10 {
		return false
	}
	for _, c := range symbol {
		if !unicode.IsLetter(c) && !unicode.IsDigit(c) && c != '.' {
			return false
		}
	}
	return true
}

func (f *Fetcher) fetchStockPriceWithContext(ctx context.Context, symbol string) (float64, error) {
	if !isValidStockSymbol(symbol) {
		return 0, fmt.Errorf("invalid stock symbol: %s", symbol)
	}

	if err := f.limiter.Wait(ctx); err != nil {
		return 0, fmt.Errorf("rate limit exceeded: %v", err)
	}

	url := fmt.Sprintf("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", apiBaseURL, symbol, apiKey)

	var lastErr error
	for i := 0; i < 3; i++ {
		resp, err := f.client.Get(url)
		if err != nil {
			lastErr = fmt.Errorf("HTTP request failed for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response body for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		var result AlphaVantageResponse
		if err := json.Unmarshal(body, &result); err != nil {
			lastErr = fmt.Errorf("failed to decode JSON for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		if result.GlobalQuote.Price == "" {
			lastErr = fmt.Errorf("no price data available for %s", symbol)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		price, err := parsePrice(result.GlobalQuote.Price)
		if err != nil {
			lastErr = fmt.Errorf("failed to parse price for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		return price, nil
	}
	return 0, lastErr
}

func (f *Fetcher) recordRequest(success bool) {
	f.metrics.mu.Lock()
	defer f.metrics.mu.Unlock()
	f.metrics.TotalRequests++
	if success {
		f.metrics.SuccessfulFetches++
	} else {
		f.metrics.FailedRequests++
	}
}

func (f *Fetcher) fetchHistoricalData() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	symbols := []string{
		"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
		"META", "NVDA", "AMD", "INTC", "IBM",
		"ORCL", "CSCO", "ADBE", "CRM", "AVGO",
		"QCOM", "TXN", "MU", "T", "VZ",
		"DIS", "NFLX", "PYPL", "SQ", "SHOP",
		"ZM", "DOCU", "SNOW", "DDOG", "CRWD",
		"ZS", "OKTA", "TEAM", "MDB", "NET",
		"ASAN", "TWLO", "RNG", "FSLY",
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, 5) // Limit concurrent requests

	for _, symbol := range symbols {
		select {
		case <-ctx.Done():
			return
		case sem <- struct{}{}:
			wg.Add(1)
			go func(s string) {
				defer wg.Done()
				defer func() { <-sem }()

				if err := f.limiter.Wait(ctx); err != nil {
					f.recordRequest(false)
					log.Printf("Rate limit exceeded for %s: %v", s, err)
					return
				}

				url := fmt.Sprintf("%s?function=TIME_SERIES_DAILY&symbol=%s&apikey=%s", apiBaseURL, s, apiKey)
				var lastErr error

				for i := 0; i < 3; i++ {
					req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
					if err != nil {
						lastErr = err
						continue
					}

					resp, err := f.client.Do(req)
					if err != nil {
						lastErr = err
						time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
						continue
					}

					body, err := io.ReadAll(resp.Body)
					resp.Body.Close()
					if err != nil {
						lastErr = err
						time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
						continue
					}

					var result HistoricalDataResponse
					if err := json.Unmarshal(body, &result); err != nil {
						lastErr = err
						time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
						continue
					}

					for date, data := range result.TimeSeriesDaily {
						price, err := parsePrice(data.Close)
						if err != nil {
							log.Printf("Failed to parse historical price for %s on %s: %v", s, date, err)
							continue
						}
						timestamp, err := time.Parse("2006-01-02", date)
						if err != nil {
							log.Printf("Failed to parse timestamp for %s on %s: %v", s, date, err)
							continue
						}
						if err := f.db.StoreStockWithTimestamp(s, price, timestamp); err != nil {
							log.Printf("Error storing historical price for %s on %s: %v", s, date, err)
						}
					}

					f.recordRequest(true)
					return
				}

				f.recordRequest(false)
				log.Printf("Failed to fetch historical data for %s after 3 attempts: %v", s, lastErr)
			}(symbol)
		}
	}

	wg.Wait()
}

func (f *Fetcher) fetchStockPrice(symbol string) (float64, error) {
	if err := f.limiter.Wait(context.Background()); err != nil {
		return 0, fmt.Errorf("rate limit exceeded: %v", err)
	}

	url := fmt.Sprintf("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", apiBaseURL, symbol, apiKey)

	var lastErr error
	for i := 0; i < 3; i++ {
		resp, err := f.client.Get(url)
		if err != nil {
			lastErr = fmt.Errorf("HTTP request failed for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response body for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		var result AlphaVantageResponse
		if err := json.Unmarshal(body, &result); err != nil {
			lastErr = fmt.Errorf("failed to decode JSON for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		if result.GlobalQuote.Price == "" {
			lastErr = fmt.Errorf("no price data available for %s", symbol)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		price, err := parsePrice(result.GlobalQuote.Price)
		if err != nil {
			lastErr = fmt.Errorf("failed to parse price for %s: %v", symbol, err)
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
			continue
		}

		return price, nil
	}
	return 0, lastErr
}

func parsePrice(priceStr string) (float64, error) {
	var price float64
	if _, err := fmt.Sscanf(priceStr, "%f", &price); err != nil {
		return 0, fmt.Errorf("failed to parse price: %v", err)
	}
	return price, nil
}

func (f *Fetcher) fetchPrices() {
	symbols := []string{
		"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
		"META", "NVDA", "AMD", "INTC", "IBM",
	}

	var wg sync.WaitGroup
	for _, symbol := range symbols {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			price, err := f.fetchStockPrice(s)
			if err != nil {
				log.Printf("Error fetching price for %s: %v", s, err)
				return
			}

			if err := f.db.StoreStock(s, price); err != nil {
				log.Printf("Error storing price for %s: %v", s, err)
			}
		}(symbol)
	}
	wg.Wait()
}
