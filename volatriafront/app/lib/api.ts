import axios, { AxiosError } from 'axios';
import { Stock, StockChartData } from '../types/stock';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// Debug logging utility
const debug = {
  log: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API]', ...args);
    }
  },
  error: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API]', ...args);
    }
  }
};

debug.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
  },
  timeout: 5000, // 5 second timeout
  withCredentials: true, // Enable sending cookies
});

// Add user ID to requests
api.interceptors.request.use((config) => {
  const userID = localStorage.getItem('userID');
  if (userID) {
    config.headers['X-User-ID'] = userID;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = (error.response.data as { error?: string })?.error || 'An error occurred';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject(new Error('No response from server'));
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject(new Error('Request failed'));
    }
  }
);

export const stockApi = {
  login: async (username: string, password: string): Promise<{ userID: number }> => {
    try {
      const response = await api.post('/login', { username, password });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Login failed');
      }
      throw error;
    }
  },

  getLatestPrice: async (symbol: string): Promise<Stock> => {
    try {
      const response = await api.get(`/stocks/${symbol}`);
      return {
        symbol: response.data.symbol,
        price: response.data.price,
        timestamp: new Date(response.data.timestamp).toISOString(),
        name: symbol // Using symbol as name for now
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Failed to get latest price');
      }
      throw error;
    }
  },

  getHistoricalPrices: async (symbol: string, range: string = '7d'): Promise<StockChartData> => {
    try {
      const response = await api.get(`/stocks/${symbol}/chart?range=${range}`);
      
      if (!response.data || !response.data.prices || !Array.isArray(response.data.prices)) {
        throw new Error('Invalid response format from server');
      }

      return {
        symbol: response.data.symbol,
        prices: response.data.prices.map((price: { symbol: string; price: number; timestamp: string }) => ({
          symbol: price.symbol,
          price: price.price,
          timestamp: new Date(price.timestamp).toISOString(),
          name: price.symbol
        }))
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Failed to get historical prices');
      }
      throw error;
    }
  },

  addToWatchlist: async (symbol: string): Promise<void> => {
    try {
      await api.post('/watchlist', { symbol });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Failed to add to watchlist');
      }
      throw error;
    }
  },

  getWatchlist: async (): Promise<Stock[]> => {
    try {
      const response = await api.get('/watchlist');
      return response.data.map((stock: { symbol: string; price: number; timestamp: string }) => ({
        symbol: stock.symbol,
        price: stock.price,
        timestamp: new Date(stock.timestamp).toISOString(),
        name: stock.symbol
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Failed to get watchlist');
      }
      throw error;
    }
  },

  getPortfolioValue: async (): Promise<{ value: number; dailyChange: number }> => {
    try {
      const response = await api.get('/portfolio/value');
      return {
        value: response.data.value,
        dailyChange: response.data.dailyChange
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error((error.response?.data as { error?: string })?.error || 'Failed to get portfolio value');
      }
      throw error;
    }
  },
}; 