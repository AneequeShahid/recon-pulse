import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
// Audited: No wappalyzer or detectStore references exist in frontend.
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/r/:reportId" element={<Dashboard />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
