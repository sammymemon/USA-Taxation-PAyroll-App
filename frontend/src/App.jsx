import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';
import InterviewMode from './InterviewMode';
import JournalMode from './JournalMode';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/interview" element={<InterviewMode />} />
        <Route path="/journal" element={<JournalMode />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
