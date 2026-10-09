import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/atkinson-hyperlegible/400-italic.css';
import '@fontsource/noto-serif/latin-400-italic.css';
import digits400 from '@fontsource/lexend/files/lexend-latin-400-normal.woff2?url';
import digits700 from '@fontsource/lexend/files/lexend-latin-700-normal.woff2?url';
import './styles.css';

// Digits come from Lexend: an open, unslashed 0 that can't be misread as Ø next to math symbols.
for (const [url, weight] of [[digits400, '400'], [digits700, '700']] as const) {
  const face = new FontFace('GL Digits', `url(${url})`, { weight, unicodeRange: 'U+0030-0039' });
  document.fonts.add(face);
  face.load().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
