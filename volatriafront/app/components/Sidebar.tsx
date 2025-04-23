import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Stock {
  symbol: string;
  price: number;
  name?: string;
}

const stockNames: { [key: string]: string } = {
  'NVDA': 'NVIDIA Corporation',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel Corporation',
  'IBM': 'International Business Machines',
  'ORCL': 'Oracle Corporation',
  'CSCO': 'Cisco Systems',
  'ADBE': 'Adobe Inc.',
  'CRM': 'Salesforce Inc.',
  'AVGO': 'Broadcom Inc.',
  'QCOM': 'Qualcomm Inc.'
};

export default function Sidebar() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('http://localhost:8080/stocks', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response was not JSON');
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }

        // Add company names to the stocks
        const stocksWithNames = data.map(stock => ({
          ...stock,
          name: stockNames[stock.symbol] || stock.symbol
        }));

        setStocks(stocksWithNames);
      } catch (error) {
        console.error('Error fetching stocks:', error);
        setError('Failed to load market data. Please try again later.');
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-pink-600 text-white p-2 rounded-r-lg shadow-lg z-50 hover:bg-pink-700 transition-colors"
      >
        {isOpen ? '→' : '←'}
      </button>

      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full w-80 bg-purple-900/50 backdrop-blur-sm border-r border-purple-800 shadow-lg z-40 p-4 overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-6 text-pink-200">Market Overview</h2>
        {loading ? (
          <div className="text-pink-200 text-sm mb-4">Loading market data...</div>
        ) : error ? (
          <div className="text-red-300 text-sm mb-4">{error}</div>
        ) : (
          <div className="space-y-3">
            {stocks.map((stock) => (
              <div
                key={stock.symbol}
                className="flex flex-col p-3 bg-purple-800/30 hover:bg-purple-800/50 rounded-lg border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-pink-200">{stock.symbol}</span>
                  <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
                </div>
                <span className="text-sm text-purple-200">{stock.name}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
} 