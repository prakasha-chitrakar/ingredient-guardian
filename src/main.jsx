import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Fade out the loading screen from index.html once the app has rendered,
// keeping it up for at least ~1 s so its motion reads as intentional.
const splash = document.getElementById('splash');
if (splash) {
  const MIN_VISIBLE_MS = 1100;
  setTimeout(() => {
    splash.classList.add('is-done');
    setTimeout(() => splash.remove(), 500);
  }, Math.max(0, MIN_VISIBLE_MS - performance.now()));
}
