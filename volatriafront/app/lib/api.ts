import axios, { AxiosError } from 'axios';
import { Stock, StockChartData } from '../types/stock';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// Debug logging utility
const debug = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API]', ...args);
    }
  },
  error: (...args: any[]) => {
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
  // Create a safe copy of headers without sensitive information
  const safeHeaders = { ...config.headers };
  delete safeHeaders['X-API-Key'];
  debug.log('Making request to:', config.url, 'with headers:', safeHeaders);
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    debug.log('Response received:', response.status, response.data);
    return response;
  },
  async (error: AxiosError) => {
    // Create a safe copy of config without sensitive information
    const safeConfig = error.config ? {
      url: error.config.url,
      method: error.config.method,
      headers: Object.fromEntries(
        Object.entries(error.config.headers || {})
          .filter(([key]) => key !== 'X-API-Key')
      )
    } : undefined;

    debug.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: safeConfig,
    });

    // If the error is due to network issues, retry the request
    if (!error.response && error.config) {
      debug.log('Retrying request due to network error');
      return api(error.config);
    }

    return Promise.reject(error);
  }
);

export const stockApi = {
  login: async (username: string, password: string): Promise<{ userID: number }> => {
    try {
      const response = await api.post('/login', { username, password });
      return response.data;
    } catch (error) {
      debug.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Login failed');
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
        timestamp: response.data.timestamp
      };
    } catch (error) {
      debug.error('Get latest price error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get latest price');
      }
      throw error;
    }
  },

  getHistoricalPrices: async (symbol: string, range: string = '7d'): Promise<StockChartData> => {
    try {
      const response = await api.get(`/stocks/${symbol}/chart?range=${range}`);
      debug.log('Historical prices response:', response.data);
      
      if (!response.data || !response.data.prices || !Array.isArray(response.data.prices)) {
        throw new Error('Invalid response format from server');
      }

      return {
        symbol: response.data.symbol,
        prices: response.data.prices.map((price: any) => ({
          symbol: price.symbol,
          price: price.price,
          timestamp: price.timestamp
        }))
      };
    } catch (error) {
      debug.error('Get historical prices error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get historical prices');
      }
      throw error;
    }
  },

  addToWatchlist: async (symbol: string): Promise<void> => {
    try {
      await api.post('/watchlist', { symbol });
    } catch (error) {
      debug.error('Add to watchlist error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to add to watchlist');
      }
      throw error;
    }
  },

  getWatchlist: async (): Promise<Stock[]> => {
    try {
      const response = await api.get('/watchlist');
      return response.data;
    } catch (error) {
      debug.error('Get watchlist error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get watchlist');
      }
      throw error;
    }
  },
}; 