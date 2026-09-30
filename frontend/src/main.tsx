import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Stillroom root element missing.');
createRoot(root).render(<StrictMode><BrowserRouter><WalletProvider><App /></WalletProvider></BrowserRouter></StrictMode>);
