import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '8px' },
            success: { style: { background: '#f0fff4', border: '1px solid #48bb78', color: '#276749' } },
            error: { style: { background: '#fff5f5', border: '1px solid #e53e3e', color: '#9b2c2c' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
