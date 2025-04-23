'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Stock, StockChartData } from './types/stock';
import Layout from './components/Layout';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import LiveChart from './components/LiveChart';
import StockCard from './components/StockCard';
import SearchForm from './components/SearchForm';

interface ChartData {
  timestamp: string;
  price: number;
  ma5: number | null;
  volume: number | null;
}

interface PopularStock {
  symbol: string;
  type: 'line' | 'bar' | 'area' | 'scatter';
  title: string;
}

const popularStocks: PopularStock[] = [
  { symbol: 'AAPL', type: 'line', title: 'Price Trend' },
  { symbol: 'MSFT', type: 'bar', title: 'Price Distribution' },
  { symbol: 'GOOGL', type: 'area', title: 'Price Area' },
  { symbol: 'AMZN', type: 'scatter', title: 'Price Points' }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const welcomeText = "Welcome to Volatria";
  const [historicalData, setHistoricalData] = useState<Record<string, Stock[]>>({});

  // Popular stocks to show
  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];

  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        setLoading(true);
        const stocks = await Promise.all(
          popularSymbols.map(async (symbol) => {
            const response = await fetch(`http://localhost:8080/stocks/${symbol}`);
            if (!response.ok) throw new Error('Failed to fetch stock data');
            return response.json();
          })
        );
        setSearchResults(stocks);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch popular stocks');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularStocks();
  }, []);

  const handleStockSelect = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      // First fetch the latest price
      const priceResponse = await fetch(`http://localhost:8080/stocks/${symbol}`);
      if (!priceResponse.ok) throw new Error('Failed to fetch stock price');
      const priceData = await priceResponse.json();

      // Then fetch historical data
      const historyResponse = await fetch(`http://localhost:8080/stocks/${symbol}/chart?range=7d`);
      if (!historyResponse.ok) {
        const errorText = await historyResponse.text();
        console.error('History response error:', errorText);
        throw new Error(`Failed to fetch historical data: ${errorText}`);
      }
      
      const historyData = await historyResponse.json();
      console.log('History data received:', historyData);

      if (!historyData || !historyData.prices || !Array.isArray(historyData.prices)) {
        console.error('Invalid history data format:', historyData);
        throw new Error('Invalid historical data format: expected an array of prices');
      }

      // Validate each data point
      const validData = historyData.prices.filter((point: any) => {
        const isValid = point && 
          typeof point.price === 'number' && 
          !isNaN(point.price) && 
          point.price > 0 &&
          point.timestamp;
        
        if (!isValid) {
          console.warn('Invalid data point:', point);
        }
        return isValid;
      });

      if (validData.length === 0) {
        throw new Error('No valid historical data points found');
      }

      // Update both states
      setHistoricalData(prev => ({
        ...prev,
        [symbol]: validData
      }));
      setSelectedStock({
        symbol,
        prices: validData
      });
    } catch (error) {
      console.error('Error in handleStockSelect:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stock data');
      setSelectedStock(null);
    } finally {
      setLoading(false);
    }
  };

  // Reset animations on mount
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
    setTextIndex(0);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (textIndex < welcomeText.length) {
      const timeout = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [textIndex]);

  // Load initial data for popular stocks
  useEffect(() => {
    popularSymbols.forEach(symbol => {
      handleStockSelect(symbol);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Sidebar />
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center py-16">
            <motion.div
              key={animationKey}
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1],
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-5xl font-bold mb-6">
                {welcomeText.split('').map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    style={{ display: 'inline-block' }}
                  >
                    {index <= textIndex ? char : ''}
                  </motion.span>
                ))}
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Your personal stock watchlist and analytics platform. Track your favorite stocks, analyze market trends, and make informed decisions.
              </p>
            </motion.div>
          </div>

          {/* Search Section */}
          <div className="mb-12">
            <SearchForm onSearch={handleStockSelect} />
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Selected Stock Section */}
          {selectedStock && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-pink-200 mb-4">
                {selectedStock.symbol} - ${selectedStock.prices[0]?.price.toFixed(2) || '0.00'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LiveChart
                  data={historicalData[selectedStock.symbol] || []}
                  symbol={selectedStock.symbol}
                  type="line"
                  title="Price Trend"
                />
                <LiveChart
                  data={historicalData[selectedStock.symbol] || []}
                  symbol={selectedStock.symbol}
                  type="bar"
                  title="Price Distribution"
                />
                <LiveChart
                  data={historicalData[selectedStock.symbol] || []}
                  symbol={selectedStock.symbol}
                  type="area"
                  title="Price Area"
                />
                <LiveChart
                  data={historicalData[selectedStock.symbol] || []}
                  symbol={selectedStock.symbol}
                  type="scatter"
                  title="Price Points"
                />
              </div>
            </div>
          )}

          {/* Popular Stocks Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularSymbols.map((symbol) => (
              <StockCard
                key={symbol}
                stock={historicalData[symbol]?.[0] || { symbol, price: 0, timestamp: new Date().toISOString() }}
                onClick={() => handleStockSelect(symbol)}
              />
            ))}
          </div>
        </div>
      </Layout>
    </div>
  );
}
