import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { Stock } from '../types/stock';

type ChartType = 'line' | 'bar' | 'area' | 'scatter';

interface LiveChartProps {
  data: Stock[];
  symbol: string;
  isLoading?: boolean;
  type?: ChartType;
  title?: string;
}

export default function LiveChart({ 
  data, 
  symbol, 
  isLoading = false, 
  type = 'line',
  title = 'Price History'
}: LiveChartProps) {
  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" opacity={0.2} />
            <XAxis dataKey="timestamp" stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <YAxis stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1B4B',
                border: '1px solid #4C1D95',
                borderRadius: '0.5rem',
                color: '#E9D5FF'
              }}
            />
            <Legend />
            <Bar dataKey="price" fill="#A78BFA" />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" opacity={0.2} />
            <XAxis dataKey="timestamp" stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <YAxis stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1B4B',
                border: '1px solid #4C1D95',
                borderRadius: '0.5rem',
                color: '#E9D5FF'
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="price" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.3} />
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" opacity={0.2} />
            <XAxis dataKey="timestamp" stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <YAxis stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1B4B',
                border: '1px solid #4C1D95',
                borderRadius: '0.5rem',
                color: '#E9D5FF'
              }}
            />
            <Legend />
            <Scatter data={data} fill="#A78BFA" />
          </ScatterChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4C1D95" opacity={0.2} />
            <XAxis dataKey="timestamp" stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <YAxis stroke="#A78BFA" tick={{ fill: '#E9D5FF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1B4B',
                border: '1px solid #4C1D95',
                borderRadius: '0.5rem',
                color: '#E9D5FF'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#A78BFA" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#C4B5FD' }} />
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className="w-full h-[300px] bg-purple-900/20 rounded-lg p-4 border border-purple-700/30"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-pink-200">{title}</h3>
        <span className="text-sm text-purple-200">{symbol}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          {renderChart()}
        </ResponsiveContainer>
      )}
    </motion.div>
  );
} 