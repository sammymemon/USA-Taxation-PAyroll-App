import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';
import InterviewMode from './InterviewMode';
import JournalMode from './JournalMode';
import Reels from './Reels';
import Checklist from './Checklist';
import SyncAuth from './SyncAuth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check initial auth state
    const token = localStorage.getItem('authToken');
    if (token) setIsAuthenticated(true);
    
    // Listen for cross-tab or component changes to auth
    const handleStorage = () => {
        setIsAuthenticated(!!localStorage.getItem('authToken'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleAuthComplete = () => {
      setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
      return <SyncAuth blocking={true} onSyncComplete={handleAuthComplete} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/interview" element={<InterviewMode />} />
        <Route path="/journal" element={<JournalMode />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/checklist" element={<Checklist />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
