import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Home = () => {
  const [animationKey, setAnimationKey] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const welcomeText = "Welcome to Volatria";

  // Reset animations on mount
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
    setTextIndex(0);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (textIndex < welcomeText.length) {
      const timeout = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [textIndex]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          key={animationKey}
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-5xl font-bold mb-6">
            <AnimatePresence mode="wait">
              {welcomeText.split('').map((char, index) => (
                <motion.span
                  key={`${char}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  style={{ display: 'inline-block' }}
                >
                  {index <= textIndex ? char : ''}
                </motion.span>
              ))}
            </AnimatePresence>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your personal stock watchlist and analytics platform. Track your favorite stocks, analyze market trends, and make informed decisions.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Get Started
          </Link>
        </motion.div>

        <motion.div
          key={`features-${animationKey}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              transition: { duration: 0.2 }
            }}
            className="bg-gray-800 p-6 rounded-lg cursor-pointer"
          >
            <h3 className="text-xl font-semibold mb-4">Real-time Tracking</h3>
            <p className="text-gray-300">Monitor stock prices in real-time with our live updates.</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              transition: { duration: 0.2 }
            }}
            className="bg-gray-800 p-6 rounded-lg cursor-pointer"
          >
            <h3 className="text-xl font-semibold mb-4">Interactive Charts</h3>
            <p className="text-gray-300">Visualize stock performance with our dynamic charting tools.</p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              transition: { duration: 0.2 }
            }}
            className="bg-gray-800 p-6 rounded-lg cursor-pointer"
          >
            <h3 className="text-xl font-semibold mb-4">Personal Watchlist</h3>
            <p className="text-gray-300">Create and manage your custom stock watchlist.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home; 