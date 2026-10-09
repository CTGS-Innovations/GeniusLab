import type { ThemeId } from '../engine/progress';

/** Theme picker cards. Swatches preview each theme, so they are literal colors (the themes' own tokens live in styles.css). */
export const THEMES: { id: ThemeId; name: string; vibe: string; swatch: string[] }[] = [
  { id: 'lab', name: 'Lab', vibe: 'Deep navy, violet glow', swatch: ['#101222', '#8b5cf6', '#facc15'] },
  { id: 'street', name: 'Streetwear', vibe: 'Black, white, signal orange', swatch: ['#0b0b0b', '#ff3b1f', '#f5e400'] },
  { id: 'y2k', name: 'Y2K Chrome', vibe: 'Iridescent pink and cyan', swatch: ['#1a1033', '#ff4fd8', '#7df9ff'] },
  { id: 'studio', name: 'Sleek Studio', vibe: 'Light, minimal, focused', swatch: ['#f5f6f8', '#3b5bdb', '#14161c'] },
  { id: 'arcade', name: 'Arcade', vibe: 'Retro console glow', swatch: ['#05030f', '#00e5a0', '#ffd000'] },
];
