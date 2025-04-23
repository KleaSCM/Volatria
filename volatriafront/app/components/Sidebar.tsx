'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Stock } from '../types/stock';
import { stockApi } from '../lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  userID: number | null;
}

export default function Sidebar({ isOpen, onClose, onToggle, userID }: SidebarProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!userID) {
          setError('Please log in to view your watchlist');
          return;
        }

        const data = await stockApi.getWatchlist();
        setStocks(data);
      } catch (err: { message?: string } | unknown) {
        console.error('Error fetching watchlist:', err);
        setError(err instanceof Error ? err.message : 'Failed to load watchlist');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchStocks();
    }
  }, [isOpen, userID]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleStockClick = (symbol: string) => {
    router.push(`/dashboard/${symbol}`);
    onClose();
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className="fixed left-4 top-4 z-50 p-2 rounded-lg bg-purple-800/50 hover:bg-purple-700/50 border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
      >
        <div className="w-6 h-5 relative flex flex-col justify-between">
          <motion.span
            animate={{ 
              rotate: isOpen ? 45 : 0,
              y: isOpen ? 8 : 0,
              width: isOpen ? '100%' : '100%'
            }}
            className="block w-full h-0.5 bg-pink-200 rounded-full"
          />
          <motion.span
            animate={{ 
              opacity: isOpen ? 0 : 1,
              width: isOpen ? '0%' : '100%'
            }}
            className="block w-full h-0.5 bg-pink-200 rounded-full"
          />
          <motion.span
            animate={{ 
              rotate: isOpen ? -45 : 0,
              y: isOpen ? -8 : 0,
              width: isOpen ? '100%' : '100%'
            }}
            className="block w-full h-0.5 bg-pink-200 rounded-full"
          />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            
            {/* Sidebar */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-0 left-0 h-full w-64 bg-purple-900/95 backdrop-blur-lg border-r border-purple-700 z-50"
            >
              <div className="p-4">
                <h2 className="text-xl font-semibold text-pink-200 mb-4">Watchlist</h2>
                {loading ? (
                  <p className="text-purple-200">Loading...</p>
                ) : error ? (
                  <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">
                    <p>{error}</p>
                    {!userID && (
                      <button
                        onClick={() => router.push('/')}
                        className="mt-2 text-sm text-pink-200 hover:text-pink-300"
                      >
                        Go to login
                      </button>
                    )}
                  </div>
                ) : stocks.length === 0 ? (
                  <p className="text-purple-200">Your watchlist is empty</p>
                ) : (
                  <div className="space-y-2">
                    {stocks.map((stock) => (
                      <motion.button
                        key={stock.symbol}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStockClick(stock.symbol)}
                        className="w-full p-4 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-pink-200">{stock.symbol}</h3>
                            <p className="text-sm text-purple-200">Last updated: {new Date(stock.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-medium text-white">${stock.price.toFixed(2)}</p>
                            <p className="text-sm text-green-400">+2.5%</p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-purple-300">Volume: 1.2M</span>
                            <span className="text-xs text-purple-300">Market Cap: $1.2B</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-purple-300">52W High: $120.50</span>
                            <span className="text-xs text-purple-300">52W Low: $80.25</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 