import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { SessionWorkspaceProvider } from './hooks/SessionWorkspace';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionWorkspaceProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/r/:reportId" element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </SessionWorkspaceProvider>
  </React.StrictMode>
);
