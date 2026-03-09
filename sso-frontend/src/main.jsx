import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App';

const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body { background:#06060a; overflow-x:hidden; }
  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:#0d0d12; }
  ::-webkit-scrollbar-thumb { background:#2a2a38; border-radius:3px; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
