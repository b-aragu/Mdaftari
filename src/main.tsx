import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './theme/index.css';

// Disable console logs in production
if (import.meta.env.PROD) {
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
    console.warn = () => { };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
