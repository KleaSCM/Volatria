'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Stock, StockChartData } from '../../types/stock';
import Layout from '../../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import LiveChart from '../../components/LiveChart';
import Sidebar from '../../components/Sidebar';

export default function StockDetail() {
  const params = useParams();
  const symbol = params?.symbol as string;
  const [stockData, setStockData] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [showHistorical, setShowHistorical] = useState(false);
  const [historicalData, setHistoricalData] = useState<StockChartData | null>(null);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch latest price
        const priceResponse = await fetch(`http://localhost:8080/stocks/${symbol}`);
        if (!priceResponse.ok) throw new Error('Failed to fetch stock price');
        const priceData = await priceResponse.json();

        // Fetch historical data
        const historyResponse = await fetch(`http://localhost:8080/stocks/${symbol}/chart?range=${timeRange}`);
        if (!historyResponse.ok) throw new Error('Failed to fetch historical data');
        const historyData = await historyResponse.json();

        if (!historyData || !historyData.prices || !Array.isArray(historyData.prices)) {
          throw new Error('Invalid historical data format');
        }

        setStockData({
          symbol: symbol as string,
          prices: historyData.prices
        });
      } catch (error) {
        console.error('Error fetching stock data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch stock data');
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchStockData();
    }
  }, [symbol, timeRange]);

  const fetchHistoricalData = async () => {
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
        symbol: symbol as string,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
        <Sidebar />
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
        <Sidebar />
        <Layout>
          <div className="max-w-7xl mx-auto p-4">
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          </div>
        </Layout>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
        <Sidebar />
        <Layout>
          <div className="max-w-7xl mx-auto p-4">
            <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-200">
              No data available for this stock
            </div>
          </div>
        </Layout>
      </div>
    );
  }

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
            <h1 className="text-4xl font-bold text-pink-200 mb-2">{symbol}</h1>
            <p className="text-2xl font-semibold text-white">
              ${stockData.prices[0]?.price.toFixed(2) || '0.00'}
            </p>
          </motion.div>

          {/* Time Range Selector */}
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
              onClick={fetchHistoricalData}
              className="px-4 py-2 rounded-lg bg-purple-800/50 text-purple-200 hover:bg-purple-700/50 hover:text-white transition-all hover:shadow-lg hover:shadow-pink-500/20"
            >
              Historical
            </button>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LiveChart
              data={stockData.prices}
              symbol={symbol as string}
              type="line"
              title="Price Trend"
            />
            <LiveChart
              data={stockData.prices}
              symbol={symbol as string}
              type="bar"
              title="Price Distribution"
            />
            <LiveChart
              data={stockData.prices}
              symbol={symbol as string}
              type="area"
              title="Price Area"
            />
            <LiveChart
              data={stockData.prices}
              symbol={symbol as string}
              type="scatter"
              title="Price Points"
            />
          </div>

          {/* Additional Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-900/50 rounded-lg border border-purple-700">
              <h3 className="text-lg font-semibold text-pink-200 mb-2">Market Cap</h3>
              <p className="text-2xl font-bold text-white">$1.2T</p>
            </div>
            <div className="p-4 bg-purple-900/50 rounded-lg border border-purple-700">
              <h3 className="text-lg font-semibold text-pink-200 mb-2">P/E Ratio</h3>
              <p className="text-2xl font-bold text-white">24.5</p>
            </div>
            <div className="p-4 bg-purple-900/50 rounded-lg border border-purple-700">
              <h3 className="text-lg font-semibold text-pink-200 mb-2">Dividend Yield</h3>
              <p className="text-2xl font-bold text-white">0.5%</p>
            </div>
          </div>

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
                      {symbol} - 5 Year Historical Data
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