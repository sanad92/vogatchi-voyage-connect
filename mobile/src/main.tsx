import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MobileApp } from './app/MobileApp';
import './styles.css';
import './app/mobile-app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MobileApp />
  </StrictMode>,
);
