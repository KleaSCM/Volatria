import { motion } from 'framer-motion';
import { Stock } from '../types/stock';
import { useState, useEffect } from 'react';

interface StockCardProps {
  stock: Stock;
  onClick?: () => void;
  className?: string;
}

export default function StockCard({ stock, onClick, className = '' }: StockCardProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(new Date(stock.timestamp).toLocaleString());
  }, [stock.timestamp]);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-6 bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20 ${className}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-pink-200">{stock.symbol}</h3>
          <p className="text-sm text-purple-200 mt-1">
            {formattedDate}
          </p>
        </div>
        <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
      </div>
    </motion.button>
  );
} 