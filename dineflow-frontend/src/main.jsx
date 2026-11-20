import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" theme="dark" toastOptions={{ style: { background: '#2F1650', border: '1px solid #43266B', color: '#FFF4E4' } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
