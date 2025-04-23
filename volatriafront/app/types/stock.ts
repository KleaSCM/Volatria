export interface Stock {
  symbol: string;
  price: number;
  timestamp: string;
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