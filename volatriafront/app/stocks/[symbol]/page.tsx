'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Stock, StockChartData } from '../../types/stock';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import LiveChart from '../../components/LiveChart';
import Sidebar from '../../components/Sidebar';

export default function StockDetail() {
  const params = useParams();
  const symbol = params?.symbol as string;
  const [stockData, setStockData] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

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
        </div>
      </Layout>
    </div>
  );
} 