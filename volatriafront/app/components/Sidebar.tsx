'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Stock } from '../types/stock';

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

const allStocks = Object.keys(stockNames);

export default function Sidebar() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch prices for all stocks in parallel
        const stockPromises = allStocks.map(async (symbol) => {
          try {
            const response = await fetch(`http://localhost:8080/stocks/${symbol}`);
            if (!response.ok) {
              const errorText = await response.text();
              // Skip stocks that don't have data yet
              if (errorText.includes('no rows in result set')) {
                return null;
              }
              console.error(`Failed to fetch ${symbol}:`, errorText);
              return null;
            }
            const data = await response.json();
            if (!data.symbol || typeof data.price !== 'number') {
              console.error(`Invalid data format for ${symbol}:`, data);
              return null;
            }
            return {
              symbol: data.symbol,
              price: data.price,
              name: stockNames[symbol] || symbol,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
            return null;
          }
        });

        const results = await Promise.all(stockPromises);
        const validStocks = results.filter((stock): stock is Stock => 
          stock !== null && 
          typeof stock.symbol === 'string' && 
          typeof stock.price === 'number' && 
          typeof stock.name === 'string'
        );
        
        if (validStocks.length === 0) {
          setError('No stock data available. Please try again later.');
        } else {
          setStocks(validStocks);
        }
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

  const handleStockClick = (symbol: string) => {
    // Use window.location to ensure full page navigation
    window.location.href = `/stocks/${symbol}`;
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
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

      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 0.5
        }}
        onClick={() => setIsOpen(false)}
        className="fixed left-0 top-0 h-full w-80 bg-purple-900/50 backdrop-blur-sm border-r border-purple-800 shadow-lg z-40 p-4 overflow-y-auto cursor-pointer"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-6 text-pink-200">Market Overview</h2>
          {loading ? (
            <div className="text-pink-200 text-sm mb-4">Loading market data...</div>
          ) : error ? (
            <div className="text-red-300 text-sm mb-4">{error}</div>
          ) : (
            <div className="space-y-3">
              {stocks.map((stock) => (
                <motion.div
                  key={stock.symbol}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStockClick(stock.symbol);
                  }}
                  className="flex flex-col p-3 bg-purple-800/30 hover:bg-purple-800/50 rounded-lg border border-purple-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-500/20 cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-pink-200">{stock.symbol}</span>
                    <span className="text-lg font-medium text-white">${stock.price.toFixed(2)}</span>
                  </div>
                  <span className="text-sm text-purple-200">{stock.name}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
} 