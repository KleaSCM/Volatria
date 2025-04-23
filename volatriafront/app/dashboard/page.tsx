'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { stockApi } from '../lib/api';
import { Stock, StockChartData } from '../types/stock';
import Layout from '../components/Layout';

export default function Dashboard() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockChartData | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = async () => {
    try {
      setError(null);
      const data = await stockApi.getWatchlist();
      setWatchlist(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol) return;

    setLoading(true);
    setError(null);
    try {
      await stockApi.addToWatchlist(newSymbol);
      setNewSymbol('');
      loadWatchlist();
    } catch (err: any) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockApi.getHistoricalPrices(symbol);
      setSelectedStock(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
        
        {/* Add Stock Form */}
        <form onSubmit={handleAddStock} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol"
              className="flex-1 px-4 py-2 rounded-lg bg-purple-800/50 border border-purple-600 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>

        {/* Watchlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {watchlist.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => handleSelectStock(stock.symbol)}
              className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-pink-200">{stock.symbol}</h2>
                <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Chart */}
        {selectedStock && (
          <div className="bg-purple-900/50 backdrop-blur-sm p-6 rounded-xl border border-purple-700">
            <h2 className="text-2xl font-semibold text-pink-200 mb-4">
              {selectedStock.symbol} Price History
            </h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedStock.prices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
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
          </div>
        )}
      </div>
    </Layout>
  );
} 