import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';
import AriaPodcast from './AriaPodcast';
import JournalMode from './JournalMode';
import Reels from './Reels';
import Checklist from './Checklist';
import AIInterview from './AIInterview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/teacher" element={<AriaPodcast />} />
        <Route path="/interview" element={<AIInterview />} />
        <Route path="/journal" element={<JournalMode />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/checklist" element={<Checklist />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
