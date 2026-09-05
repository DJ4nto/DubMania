import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installFavicon } from './lib/browser/favicon';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/responsive.css';

installFavicon();

const root = document.getElementById('root');

if (!root) {
  throw new Error(
    "L'élément racine de DubMania est introuvable.",
  );
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
