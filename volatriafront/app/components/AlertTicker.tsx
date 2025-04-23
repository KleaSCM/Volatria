import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AlertTickerProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export default function AlertTicker({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: AlertTickerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/50 border-green-700 text-green-200';
      case 'warning':
        return 'bg-yellow-900/50 border-yellow-700 text-yellow-200';
      case 'error':
        return 'bg-red-900/50 border-red-700 text-red-200';
      default:
        return 'bg-purple-900/50 border-purple-700 text-purple-200';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 p-4 rounded-lg border backdrop-blur-sm shadow-lg ${getAlertStyles()}`}
        >
          <div className="flex items-center">
            <span className="mr-2">{message}</span>
            <button
              onClick={() => {
                setIsVisible(false);
                onClose?.();
              }}
              className="ml-2 text-current hover:text-white"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 