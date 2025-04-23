package fetcher

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/klea/volatria/volatria/internal/database"
)

const (
	apiKey     = "d04bbfpr01qm4vp6enf0d04bbfpr01qm4vp6enfg"
	apiBaseURL = "https://www.alphavantage.co/query"
)

type Fetcher struct {
	db         *database.Database
	ticker     *time.Ticker
	done       chan bool
	lastPrices map[string]float64
}

func New(db *database.Database) *Fetcher {
	return &Fetcher{
		db:         db,
		ticker:     time.NewTicker(1 * time.Minute),
		done:       make(chan bool),
		lastPrices: make(map[string]float64),
	}
}

func (f *Fetcher) Start() {
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
}

func (f *Fetcher) Stop() {
	f.done <- true
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

func (f *Fetcher) fetchHistoricalData() {
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

	for _, symbol := range symbols {
		url := fmt.Sprintf("%s?function=TIME_SERIES_DAILY&symbol=%s&apikey=%s", apiBaseURL, symbol, apiKey)
		log.Printf("Fetching historical data for %s from URL: %s", symbol, url)

		resp, err := http.Get(url)
		if err != nil {
			log.Printf("HTTP request failed for historical data of %s: %v", symbol, err)
			continue
		}
		defer resp.Body.Close()

		// Log response status and headers
		log.Printf("Historical data response status for %s: %s", symbol, resp.Status)
		log.Printf("Historical data response headers for %s: %v", symbol, resp.Header)

		// Read and log the raw response body
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read historical data response body for %s: %v", symbol, err)
			continue
		}
		log.Printf("Raw historical data response for %s: %s", symbol, string(body))

		var result HistoricalDataResponse
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("Failed to decode historical data JSON for %s: %v", symbol, err)
			continue
		}

		log.Printf("Decoded historical data for %s: %+v", symbol, result)

		for date, data := range result.TimeSeriesDaily {
			price, err := parsePrice(data.Close)
			if err != nil {
				log.Printf("Failed to parse historical price for %s on %s: %v", symbol, date, err)
				continue
			}
			timestamp, err := time.Parse("2006-01-02", date)
			if err != nil {
				log.Printf("Failed to parse timestamp for %s on %s: %v", symbol, date, err)
				continue
			}
			if err := f.db.StoreStockWithTimestamp(symbol, price, timestamp); err != nil {
				log.Printf("Error storing historical price for %s on %s: %v", symbol, date, err)
			} else {
				log.Printf("Successfully stored historical price for %s on %s: %.2f", symbol, date, price)
			}
		}
	}
}

func (f *Fetcher) fetchStockPrice(symbol string) (float64, error) {
	url := fmt.Sprintf("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", apiBaseURL, symbol, apiKey)
	log.Printf("Fetching stock price for %s from URL: %s", symbol, url)

	resp, err := http.Get(url)
	if err != nil {
		log.Printf("HTTP request failed for %s: %v", symbol, err)
		return 0, fmt.Errorf("failed to fetch stock price: %v", err)
	}
	defer resp.Body.Close()

	// Log response status and headers
	log.Printf("Response status for %s: %s", symbol, resp.Status)
	log.Printf("Response headers for %s: %v", symbol, resp.Header)

	// Read and log the raw response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read response body for %s: %v", symbol, err)
		return 0, fmt.Errorf("failed to read response: %v", err)
	}
	log.Printf("Raw response for %s: %s", symbol, string(body))

	var result AlphaVantageResponse
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("Failed to decode JSON for %s: %v", symbol, err)
		return 0, fmt.Errorf("failed to decode response: %v", err)
	}

	log.Printf("Decoded response for %s: %+v", symbol, result)

	if result.GlobalQuote.Price == "" {
		log.Printf("No price data in response for %s", symbol)
		return 0, fmt.Errorf("no price data available for %s", symbol)
	}

	price, err := parsePrice(result.GlobalQuote.Price)
	if err != nil {
		log.Printf("Failed to parse price for %s: %v", symbol, err)
		return 0, err
	}

	log.Printf("Successfully fetched price for %s: %.2f", symbol, price)
	return price, nil
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

	for _, symbol := range symbols {
		price, err := f.fetchStockPrice(symbol)
		if err != nil {
			log.Printf("Error fetching price for %s: %v", symbol, err)
			continue
		}

		if err := f.db.StoreStock(symbol, price); err != nil {
			log.Printf("Error storing price for %s: %v", symbol, err)
		}
	}
}
