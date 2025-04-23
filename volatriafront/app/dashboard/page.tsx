'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { stockApi } from '../lib/api';
import { Stock, StockChartData } from '../types/stock';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import LiveChart from '../components/LiveChart';
import AlertTicker from '../components/AlertTicker';
import Profile from '../components/Profile';
import Image from 'next/image';

const COLORS = ['#EC4899', '#A855F7', '#3B82F6', '#10B981', '#F59E0B'];

export default function Dashboard() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockChartData | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  const [alerts, setAlerts] = useState<{id: number, message: string, type: 'info' | 'success' | 'warning' | 'error'}[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    theme: 'dark',
    notifications: true,
    defaultTimeRange: '7d',
    showTechnicalIndicators: true,
  });

  useEffect(() => {
    if (error) {
      setAlerts([...alerts, {
        id: Date.now(),
        message: error,
        type: 'error'
      }]);
      setError(null);
    }
  }, [error, alerts]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadWatchlist();
        const portfolioData = await stockApi.getPortfolioValue();
        setPortfolioValue(portfolioData.value);
        setDailyChange(portfolioData.dailyChange);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio data');
      }
    };
    loadData();
  }, []);

  const loadWatchlist = async () => {
    try {
      setError(null);
      const data = await stockApi.getWatchlist();
      setWatchlist(data);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist');
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
      await loadWatchlist();
      const portfolioData = await stockApi.getPortfolioValue();
      setPortfolioValue(portfolioData.value);
      setDailyChange(portfolioData.dailyChange);
      setAlerts([...alerts, {
        id: Date.now(),
        message: `Added ${newSymbol} to watchlist`,
        type: 'success'
      }]);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
      setAlerts([...alerts, {
        id: Date.now(),
        message: err instanceof Error ? err.message : 'Failed to add stock',
        type: 'error'
      }]);
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
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAlert = (id: number) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const handleLogout = () => {
    // Implement logout logic
    router.push('/');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Alerts */}
        <div className="fixed top-4 right-16 z-50 flex items-center gap-35">
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {alerts.map(alert => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertTicker
                    message={alert.message}
                    type={alert.type}
                    onClose={() => handleRemoveAlert(alert.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile */}
        <div className="fixed top-4 right-4 z-50">
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Profile 
                  username="Shandris" 
                  onLogout={handleLogout} 
                  profilePicture="/shandris1.jpg"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="p-1 bg-purple-900/50 backdrop-blur-sm rounded-full border border-purple-700 hover:border-pink-500 transition-colors"
          >
            <div className="relative w-8 h-8">
              <Image
                src="/shandris1.jpg"
                alt="Profile"
                fill
                className="rounded-full object-cover border-2 border-purple-600"
                priority
              />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-4">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700"
              >
                <h3 className="text-lg font-semibold text-pink-200 mb-2">Portfolio Value</h3>
                <p className="text-3xl font-bold text-white">${portfolioValue.toFixed(2)}</p>
                <p className={`text-sm ${dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)} (2.0%)
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700"
              >
                <h3 className="text-lg font-semibold text-pink-200 mb-2">Watchlist</h3>
                <p className="text-3xl font-bold text-white">{watchlist.length}</p>
                <p className="text-sm text-purple-200">Stocks tracked</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700"
              >
                <h3 className="text-lg font-semibold text-pink-200 mb-2">Market Status</h3>
                <p className="text-3xl font-bold text-white">Open</p>
                <p className="text-sm text-purple-200">NYSE: 9:30 AM - 4:00 PM</p>
              </motion.div>
            </div>

            {/* Portfolio Performance Chart */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-pink-200">Portfolio Performance</h3>
                <select
                  value={userPreferences.defaultTimeRange}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, defaultTimeRange: e.target.value }))}
                  className="bg-purple-800/50 border border-purple-700 rounded-lg px-3 py-1 text-white"
                >
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="1m">1 Month</option>
                  <option value="1y">1 Year</option>
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { date: '2024-01', value: 10000 },
                      { date: '2024-02', value: 10500 },
                      { date: '2024-03', value: 11000 },
                      { date: '2024-04', value: 11500 },
                      { date: '2024-05', value: portfolioValue }
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #4B5563',
                        borderRadius: '0.5rem',
                        color: '#F3F4F6'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#EC4899"
                      strokeWidth={2}
                      dot={{ fill: '#EC4899', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Portfolio Allocation Chart */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-8 p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700"
            >
              <h3 className="text-lg font-semibold text-pink-200 mb-4">Portfolio Allocation</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={watchlist.map((stock, index) => ({
                        name: stock.symbol,
                        value: stock.price,
                        color: COLORS[index % COLORS.length]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {watchlist.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #4B5563',
                        borderRadius: '0.5rem',
                        color: '#F3F4F6'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

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

            {/* Watchlist and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Watchlist */}
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-semibold text-pink-200 mb-4">Watchlist</h2>
                <div className="space-y-4">
                  {watchlist.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleSelectStock(stock.symbol)}
                      className="w-full p-4 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-pink-200">{stock.symbol}</h3>
                          <p className="text-sm text-purple-200">Last updated: {format(new Date(), 'HH:mm')}</p>
                        </div>
                        <span className="text-xl font-medium text-white">${stock.price.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="lg:col-span-2">
                {selectedStock ? (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-pink-200">
                      {selectedStock.symbol} Analysis
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <LiveChart
                        data={selectedStock.prices}
                        symbol={selectedStock.symbol}
                        type="line"
                        title="Price Trend"
                      />
                      <LiveChart
                        data={selectedStock.prices}
                        symbol={selectedStock.symbol}
                        type="area"
                        title="Price Area"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700">
                    <p className="text-purple-200">Select a stock from your watchlist to view analysis</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 