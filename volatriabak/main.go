package main

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/klea/volatria/volatria/internal/api"
	"github.com/klea/volatria/volatria/internal/database"
	"github.com/klea/volatria/volatria/internal/fetcher"
)

func main() {
	// Initialize database
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize fetcher
	stockFetcher := fetcher.New(db)
	stockFetcher.Start()
	defer stockFetcher.Stop()

	// Initialize API handlers
	handler := api.New(db)

	// Set up Gin router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "X-User-ID", "X-API-Key", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Public routes
	r.POST("/login", handler.Login)
	r.GET("/stocks/:symbol", handler.GetLatestPrice)
	r.GET("/stocks/:symbol/chart", handler.GetHistoricalPrices)
	r.GET("/stocks", handler.GetPopularStocks)

	// Protected routes
	api := r.Group("/")
	api.Use(handler.AuthMiddleware())
	{
		api.POST("/watchlist", handler.AddToWatchlist)
		api.GET("/watchlist", handler.GetWatchlist)
	}

	// Start server
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
