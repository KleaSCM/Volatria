'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { stockApi } from './lib/api';
import { Stock, StockChartData } from './types/stock';
import Layout from './components/Layout';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';

interface ChartData {
  timestamp: string;
  price: number;
  ma5: number | null;
  volume: number | null;
}

export default function Home() {
  const [popularStocks, setPopularStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const welcomeText = "Welcome to Volatria";

  // Popular stocks to show
  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];

  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        setLoading(true);
        const stocks = await Promise.all(
          popularSymbols.map(symbol => stockApi.getLatestPrice(symbol))
        );
        setPopularStocks(stocks);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch popular stocks');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularStocks();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    setLoading(true);
    setError(null);
    try {
      const stock = await stockApi.getLatestPrice(searchQuery.toUpperCase());
      setSearchResults([stock]);
    } catch (err: any) {
      setError(err.message || 'Stock not found');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching historical data for:', symbol);
      const data = await stockApi.getHistoricalPrices(symbol);
      console.log('Received data:', data);
      
      if (!data || !data.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
        throw new Error('No price data available for this stock');
      }

      // Ensure all prices have valid data
      const validPrices = data.prices.filter(price => {
        const isValid = price && 
          typeof price.price === 'number' && 
          !isNaN(price.price) && 
          price.price > 0 &&
          price.timestamp;
        
        if (!isValid) {
          console.warn('Invalid price data:', price);
        }
        return isValid;
      });

      if (validPrices.length === 0) {
        throw new Error('No valid price data available');
      }

      console.log('Valid prices:', validPrices);
      setSelectedStock({
        symbol: data.symbol,
        prices: validPrices
      });
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err.message || 'Failed to fetch stock data');
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
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  placeholder="Search for a stock symbol..."
                  className="flex-1 px-4 py-2 rounded-lg bg-purple-800/50 border border-purple-600 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-pink-200 mb-4">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleSelectStock(stock.symbol)}
                    className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-pink-200">{stock.symbol}</h3>
                      <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Stocks */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-pink-200 mb-4">Popular Stocks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleSelectStock(stock.symbol)}
                  className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-pink-200">{stock.symbol}</h3>
                    <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Stock Chart */}
          {selectedStock && selectedStock.prices && selectedStock.prices.length > 0 && (
            <div className="bg-purple-900/50 backdrop-blur-sm p-6 rounded-xl border border-purple-700">
              <h2 className="text-2xl font-semibold text-pink-200 mb-4">
                {selectedStock.symbol} Price History
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={selectedStock.prices
                      .map((price, index, array) => {
                        // Calculate 5-day moving average
                        let ma5: number | null = null;
                        if (index >= 5) {
                          const prices = array.slice(index - 5, index + 1).map(p => p.price);
                          const sum = prices.reduce((acc, curr) => acc + curr, 0);
                          ma5 = sum / prices.length;
                        }
                        
                        // Calculate volume (simulated based on price change)
                        let volume: number | null = null;
                        if (index > 0) {
                          const prevPrice = array[index - 1].price;
                          const priceChange = (price.price - prevPrice) / prevPrice;
                          volume = Math.abs(priceChange) * 1000000;
                        }

                        return {
                          timestamp: price.timestamp,
                          price: price.price,
                          ma5: ma5,
                          volume: volume
                        };
                      })
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: '#A78BFA' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#A78BFA' }}
                      domain={['auto', 'auto']}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#A78BFA' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #4C1D95',
                        borderRadius: '0.5rem',
                        color: '#E9D5FF'
                      }}
                      formatter={(value: number, name: string) => {
                        if (value === null || value === undefined) return ['N/A', name];
                        return [
                          name === 'price' ? `$${value.toFixed(2)}` : 
                          name === 'ma5' ? `$${value.toFixed(2)}` : 
                          `${value.toLocaleString()} shares`,
                          name === 'price' ? 'Price' : 
                          name === 'ma5' ? '5-Day MA' : 'Volume'
                        ];
                      }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '20px',
                        color: '#E9D5FF'
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      stroke="#EC4899"
                      strokeWidth={2}
                      dot={false}
                      name="Price"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ma5"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      name="5-Day MA"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="volume"
                      stroke="#A78BFA"
                      strokeWidth={2}
                      dot={false}
                      name="Volume"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
}
