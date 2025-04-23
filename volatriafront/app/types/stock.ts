export interface Stock {
  symbol: string;
  price: number;
  timestamp: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
  title?: string;
}

export interface StockChartData {
  symbol: string;
  prices: Stock[];
}

export interface WatchlistItem {
  symbol: string;
  currentPrice: number;
  change: number;
} 