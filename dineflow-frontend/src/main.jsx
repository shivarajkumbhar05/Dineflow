import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const savedTheme = localStorage.getItem('dineflow-theme') === 'light' ? 'light' : 'dark';
document.documentElement.dataset.theme = savedTheme;
document.documentElement.style.colorScheme = savedTheme;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" theme="system" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
