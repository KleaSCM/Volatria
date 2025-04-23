import { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [userID, setUserID] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUserID = localStorage.getItem('userID');
    if (storedUserID) {
      setUserID(parseInt(storedUserID));
    }
  }, []);

  const handleLogin = (id: number) => {
    setUserID(id);
    localStorage.setItem('userID', id.toString());
  };

  const handleLogout = () => {
    setUserID(null);
    localStorage.removeItem('userID');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
      <motion.div
        initial={{ marginLeft: 0 }}
        whileHover={{ marginLeft: "20rem" }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 0.5
        }}
      >
        <Navigation userID={userID} onLogin={handleLogin} onLogout={handleLogout} />
        <main className="p-8">
          {children}
        </main>
      </motion.div>
    </div>
  );
} 