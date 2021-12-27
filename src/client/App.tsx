import React from 'react';
import {Home, NotFound, Meeting} from './pages';
import {BrowserRouter, Routes, Route} from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="meeting/:roomname" element={<Meeting />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
