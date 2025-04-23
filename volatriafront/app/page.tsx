'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Stock, StockChartData } from './types/stock';
import Layout from './components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
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

const stockNames: { [key: string]: string } = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms Inc.',
  'NVDA': 'NVIDIA Corporation',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel Corporation',
  'IBM': 'International Business Machines',
  'ORCL': 'Oracle Corporation',
  'CSCO': 'Cisco Systems',
  'ADBE': 'Adobe Inc.',
  'CRM': 'Salesforce Inc.',
  'AVGO': 'Broadcom Inc.',
  'QCOM': 'Qualcomm Inc.',
  'TXN': 'Texas Instruments',
  'MU': 'Micron Technology',
  'T': 'AT&T Inc.',
  'VZ': 'Verizon Communications',
  'DIS': 'The Walt Disney Company',
  'NFLX': 'Netflix Inc.',
  'PYPL': 'PayPal Holdings',
  'SQ': 'Square Inc.',
  'SHOP': 'Shopify Inc.',
  'ZM': 'Zoom Video Communications',
  'DOCU': 'DocuSign Inc.',
  'SNOW': 'Snowflake Inc.',
  'DDOG': 'Datadog Inc.',
  'CRWD': 'CrowdStrike Holdings',
  'ZS': 'Zscaler Inc.',
  'OKTA': 'Okta Inc.',
  'TEAM': 'Atlassian Corporation',
  'MDB': 'MongoDB Inc.',
  'NET': 'Cloudflare Inc.',
  'ASAN': 'Asana Inc.',
  'TWLO': 'Twilio Inc.',
  'RNG': 'RingCentral Inc.',
  'FSLY': 'Fastly Inc.'
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const welcomeText = "Welcome to Volatria";
  const [timeRange, setTimeRange] = useState('7d');
  const [showHistorical, setShowHistorical] = useState(false);
  const [historicalData, setHistoricalData] = useState<StockChartData | null>(null);
  const router = useRouter();

  // Popular stocks to show
  const popularSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META',
    'NVDA', 'AMD', 'INTC', 'IBM', 'ORCL', 'CSCO',
    'ADBE', 'CRM', 'AVGO', 'QCOM', 'TXN', 'MU',
    'T', 'VZ', 'DIS', 'NFLX', 'PYPL', 'SQ'
  ];

  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        setLoading(true);
        const stocks = await Promise.all(
          popularSymbols.map(async (symbol) => {
            try {
              const response = await fetch(`http://localhost:8080/stocks/${symbol}`);
              if (!response.ok) {
                const errorText = await response.text();
                if (errorText.includes('no rows in result set')) {
                  console.log(`No data available for ${symbol}, skipping...`);
                  return null;
                }
                throw new Error(`Failed to fetch stock data: ${errorText}`);
              }
              const data = await response.json();
              return {
                symbol: data.symbol,
                price: data.price,
                timestamp: new Date().toISOString(),
                name: stockNames[symbol] || symbol
              };
            } catch (error) {
              console.error(`Error fetching ${symbol}:`, error);
              return null;
            }
          })
        );
        // Filter out any null results and set the valid stocks
        const validStocks = stocks.filter((stock): stock is Stock => stock !== null);
        setSearchResults(validStocks);
        if (validStocks.length === 0) {
          setError('No stock data available. Please try again later.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch popular stocks');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularStocks();
  }, []);

  useEffect(() => {
    const fetchStockData = async () => {
      if (!selectedStock) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch historical data for the selected time range
        const historyResponse = await fetch(`http://localhost:8080/stocks/${selectedStock.symbol}/chart?range=${timeRange}`);
        if (!historyResponse.ok) throw new Error('Failed to fetch historical data');
        const historyData = await historyResponse.json();
        
        if (!historyData || !historyData.prices || !Array.isArray(historyData.prices)) {
          throw new Error('Invalid historical data format');
        }

        setHistoricalData({
          symbol: selectedStock.symbol,
          prices: historyData.prices
        });
      } catch (error) {
        console.error('Error fetching stock data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selectedStock, timeRange]);

  const handleStockSelect = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      // First fetch the latest price
      const priceResponse = await fetch(`http://localhost:8080/stocks/${symbol}`);
      if (!priceResponse.ok) {
        const errorText = await priceResponse.text();
        if (errorText.includes('no rows in result set')) {
          setError(`No data available for ${symbol}. Please try another stock.`);
          setSelectedStock(null);
          return;
        }
        throw new Error(`Failed to fetch stock price: ${errorText}`);
      }
      const priceData = await priceResponse.json();
      if (!priceData.symbol || typeof priceData.price !== 'number') {
        throw new Error('Invalid price data format');
      }

      // Then fetch historical data for the current time range
      const historyResponse = await fetch(`http://localhost:8080/stocks/${symbol}/chart?range=${timeRange}`);
      if (!historyResponse.ok) {
        const errorText = await historyResponse.text();
        if (errorText.includes('no rows in result set')) {
          setError(`No historical data available for ${symbol}. Please try another stock.`);
          setSelectedStock(null);
          return;
        }
        throw new Error(`Failed to fetch historical data: ${errorText}`);
      }
      
      const historyData = await historyResponse.json();
      if (!historyData || !historyData.prices || !Array.isArray(historyData.prices)) {
        throw new Error('Invalid historical data format: expected an array of prices');
      }

      // Validate each data point
      const validData = historyData.prices.map((point: any) => ({
        symbol: point.symbol || symbol,
        price: point.price,
        timestamp: point.timestamp || new Date().toISOString(),
        name: stockNames[symbol] || symbol
      })).filter((point: any) => 
        point && 
        typeof point.price === 'number' && 
        !isNaN(point.price) && 
        point.price > 0 &&
        point.timestamp
      );

      if (validData.length === 0) {
        setError(`No valid historical data points found for ${symbol}. Please try another stock.`);
        setSelectedStock(null);
        return;
      }

      // Update both states
      setHistoricalData({
        symbol,
        prices: validData
      });
      setSelectedStock(validData[0]);
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

  const fetchHistoricalData = async (symbol: string) => {
    try {
      setLoading(true);
      // Use 1y as the default range for historical data since 5y is not supported
      const response = await fetch(`http://localhost:8080/stocks/${symbol}/chart?range=1y`);
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('no rows in result set')) {
          setError(`No historical data available for ${symbol}. Please try another stock.`);
          return;
        }
        throw new Error(`Failed to fetch historical data: ${errorText}`);
      }
      const data = await response.json();
      
      if (!data || !data.prices || !Array.isArray(data.prices)) {
        throw new Error('Invalid historical data format');
      }

      setHistoricalData({
        symbol,
        prices: data.prices
      });
      setShowHistorical(true);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
      <Sidebar />
      <Layout>
        <div className="max-w-7xl mx-auto p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-pink-200 mb-2">Market Overview</h1>
            <p className="text-2xl font-semibold text-white">
              {selectedStock ? `${selectedStock.symbol} - $${selectedStock.price.toFixed(2)}` : 'Select a stock to view details'}
            </p>
          </motion.div>

          {/* Time Range Selector - Only show when a stock is selected */}
          {selectedStock && (
            <div className="flex gap-4 mb-8">
              {['7d', '1m', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg ${
                    timeRange === range
                      ? 'bg-pink-600 text-white'
                      : 'bg-purple-800/50 text-purple-200 hover:bg-purple-700/50'
                  }`}
                >
                  {range}
                </button>
              ))}
              <button
                onClick={() => fetchHistoricalData(selectedStock.symbol)}
                className="px-4 py-2 rounded-lg bg-purple-800/50 text-purple-200 hover:bg-purple-700/50 hover:text-white transition-all hover:shadow-lg hover:shadow-pink-500/20"
              >
                Historical
              </button>
            </div>
          )}

          {/* Search Section */}
          <div className="mb-12">
            <SearchForm onSearch={handleStockSelect} />
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Popular Stocks Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {searchResults.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onClick={() => handleStockSelect(stock.symbol)}
              />
            ))}
          </div>

          {/* Selected Stock Section */}
          {selectedStock && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-pink-200 mb-4">
                {selectedStock.symbol} - ${selectedStock.price.toFixed(2)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LiveChart
                  data={historicalData?.prices || []}
                  symbol={selectedStock.symbol}
                  type="line"
                  title="Price Trend"
                />
                <LiveChart
                  data={historicalData?.prices || []}
                  symbol={selectedStock.symbol}
                  type="bar"
                  title="Price Distribution"
                />
                <LiveChart
                  data={historicalData?.prices || []}
                  symbol={selectedStock.symbol}
                  type="area"
                  title="Price Area"
                />
                <LiveChart
                  data={historicalData?.prices || []}
                  symbol={selectedStock.symbol}
                  type="scatter"
                  title="Price Points"
                />
              </div>
            </div>
          )}

          <AnimatePresence>
            {showHistorical && historicalData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowHistorical(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-purple-900/95 p-6 rounded-xl border border-purple-700 w-full max-w-6xl h-[80vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-pink-200">
                      {historicalData.symbol} - 5 Year Historical Data
                    </h2>
                    <button
                      onClick={() => setShowHistorical(false)}
                      className="text-purple-200 hover:text-pink-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="h-[calc(80vh-4rem)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData.prices}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
                          stroke="#E9D5FF"
                        />
                        <YAxis stroke="#E9D5FF" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#4C1D95',
                            border: '1px solid #9333EA',
                            borderRadius: '0.5rem',
                            color: '#E9D5FF'
                          }}
                          labelFormatter={(value) => format(new Date(value), 'PPp')}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#EC4899"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </div>
  );
}
