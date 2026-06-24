import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './styles/index.css';
import './i18n';
import { loadImportedFontFaces } from './features/font/api';

loadImportedFontFaces().catch(() => {
  // 字体加载失败不影响应用启动
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
