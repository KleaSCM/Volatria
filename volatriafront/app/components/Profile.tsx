import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ProfileProps {
  username: string;
  onLogout: () => void;
  profilePicture?: string;
  setShowProfile: (show: boolean) => void;
}

export default function Profile({ username, onLogout, profilePicture, setShowProfile }: ProfileProps) {
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    notifications: true,
    defaultTimeRange: '7d',
    showTechnicalIndicators: true,
  });

  const handlePreferenceChange = (key: keyof typeof preferences, value: string | boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-purple-900/50 backdrop-blur-sm rounded-xl border border-purple-700 p-6 sticky top-4"
    >
      <div className="flex justify-between items-start mb-6">
        <button
          onClick={() => setShowProfile(false)}
          className="text-purple-300 hover:text-pink-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 mb-4">
          <Image
            src={profilePicture || '/shandris1.jpg'}
            alt={`${username}'s profile picture`}
            fill
            className="rounded-full object-cover border-2 border-purple-500"
          />
        </div>
        <h2 className="text-xl font-semibold text-pink-200">{username}</h2>
        <p className="text-sm text-purple-200">Premium Member</p>
        <p className="text-xs text-purple-300 mt-1">Trading Enthusiast & Market Analyst</p>
        <p className="text-xs text-purple-400 mt-1">Member since 2024</p>
      </div>

      {/* Trading Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-800/30 rounded-lg p-3 text-center border border-purple-700">
          <p className="text-sm text-purple-300">Total Trades</p>
          <p className="text-xl font-bold text-pink-200">128</p>
        </div>
        <div className="bg-purple-800/30 rounded-lg p-3 text-center border border-purple-700">
          <p className="text-sm text-purple-300">Win Rate</p>
          <p className="text-xl font-bold text-pink-200">78%</p>
        </div>
        <div className="bg-purple-800/30 rounded-lg p-3 text-center border border-purple-700">
          <p className="text-sm text-purple-300">Best Trade</p>
          <p className="text-xl font-bold text-pink-200">+24.5%</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-purple-200">Theme</span>
          <select
            value={preferences.theme}
            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
            className="bg-purple-800/50 border border-purple-700 rounded-lg px-3 py-1 text-white"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-purple-200">Notifications</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-purple-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-purple-200">Default Time Range</span>
          <select
            value={preferences.defaultTimeRange}
            onChange={(e) => handlePreferenceChange('defaultTimeRange', e.target.value)}
            className="bg-purple-800/50 border border-purple-700 rounded-lg px-3 py-1 text-white"
          >
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
            <option value="1m">1 Month</option>
            <option value="1y">1 Year</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-purple-200">Technical Indicators</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.showTechnicalIndicators}
              onChange={(e) => handlePreferenceChange('showTechnicalIndicators', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-purple-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-full mt-6 px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Logout
      </button>
    </motion.div>
  );
} 