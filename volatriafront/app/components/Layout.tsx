import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import Profile from './Profile';

interface LayoutProps {
  children: React.ReactNode;
}

interface DashboardProps {
  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
}

export default function Layout({ children }: LayoutProps) {
  const [userID, setUserID] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

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
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white">
      <Navigation 
        userID={userID} 
        onLogin={handleLogin} 
        onLogout={handleLogout}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        userID={userID}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {React.cloneElement(children as React.ReactElement<DashboardProps>, {
          showProfile,
          setShowProfile
        })}
      </main>
      {/* Profile Box */}
      {showProfile && (
        <div className="fixed top-4 right-4 z-50">
          <Profile 
            username="Shandris" 
            onLogout={handleLogout} 
            profilePicture="/shandris1.jpg"
            setShowProfile={setShowProfile}
          />
        </div>
      )}
    </div>
  );
} 