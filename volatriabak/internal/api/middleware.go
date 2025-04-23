package api

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.Mutex
	rps      int
}

func NewRateLimiter(rps int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rps:      rps,
	}
}

func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if limiter, exists := rl.limiters[key]; exists {
		return limiter
	}

	limiter := rate.NewLimiter(rate.Limit(rl.rps), rl.rps)
	rl.limiters[key] = limiter
	return limiter
}

func (rl *RateLimiter) Limit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use IP address as the key for rate limiting
		ip := c.ClientIP()
		limiter := rl.getLimiter(ip)

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, ErrorResponse{Error: "Rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}

type CircuitBreaker struct {
	failures    int
	lastFailure time.Time
	mu          sync.Mutex
	threshold   int
	timeout     time.Duration
}

func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		threshold: threshold,
		timeout:   timeout,
	}
}

func (cb *CircuitBreaker) Protect() gin.HandlerFunc {
	return func(c *gin.Context) {
		cb.mu.Lock()
		if cb.failures >= cb.threshold {
			if time.Since(cb.lastFailure) < cb.timeout {
				cb.mu.Unlock()
				c.JSON(http.StatusServiceUnavailable, ErrorResponse{Error: "Service temporarily unavailable"})
				c.Abort()
				return
			}
			cb.failures = 0
		}
		cb.mu.Unlock()

		c.Next()

		if c.Writer.Status() >= 500 {
			cb.mu.Lock()
			cb.failures++
			cb.lastFailure = time.Now()
			cb.mu.Unlock()
		}
	}
}

type RequestLogger struct {
	mu sync.Mutex
}

func NewRequestLogger() *RequestLogger {
	return &RequestLogger{}
}

func (rl *RequestLogger) Log() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		rl.mu.Lock()
		fmt.Printf("[%s] %s %s %d %s\n",
			time.Now().Format(time.RFC3339),
			method,
			path,
			status,
			latency,
		)
		rl.mu.Unlock()
	}
}
