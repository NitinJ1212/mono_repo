// src/main.jsx
import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App';

// Global reset
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #070709; }
  button:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }
  ::-webkit-scrollbar       { width: 6px; }
  ::-webkit-scrollbar-track { background: #0e0e12; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
`;
document.head.appendChild(globalStyle);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
