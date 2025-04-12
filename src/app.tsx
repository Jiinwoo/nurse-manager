import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import layouts and pages
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NurseManagement from './pages/NurseManagement';
import TeamManagement from './pages/TeamManagement';
import ShiftManagement from './pages/ShiftManagement';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="nurses" element={<NurseManagement />} />
          <Route path="teams" element={<TeamManagement />} />
          <Route path="shifts" element={<ShiftManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

// Initialize React app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    const root = createRoot(appDiv);
    root.render(<App />);
  });
}