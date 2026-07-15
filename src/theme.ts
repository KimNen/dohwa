import type { Style } from './types.js';

/**
 * Optional presets. Nothing in the engine depends on these —
 * they exist so you don't have to invent a palette to get started,
 * and so you can swap ours out for yours in one line.
 */

export interface Swatch {
  /** stable key for i18n / testing */
  key: string;
  label: string;
  /** CSS color, or 'transparent' */
  value: string;
}

export interface Palette {
  key: string;
  label: string;
  strokes: Swatch[];
  fills: Swatch[];
  /** suggested default style when this palette is active */
  defaultStyle: Style;
}

/** Ink on hanji paper — the dohwa house palette. */
export const HANJI_PALETTE: Palette = {
  key: 'hanji',
  label: 'Hanji',
  strokes: [
    { key: 'ink', label: 'Ink', value: '#221d18' },
    { key: 'vermillion', label: 'Vermillion', value: '#c8431f' },
    { key: 'indigo', label: 'Indigo', value: '#27496d' },
    { key: 'pine', label: 'Pine', value: '#3e6b47' },
    { key: 'ochre', label: 'Ochre', value: '#b07d2b' },
  ],
  fills: [
    { key: 'none', label: 'None', value: 'transparent' },
    { key: 'ink', label: 'Ink wash', value: 'rgba(34,29,24,0.12)' },
    { key: 'vermillion', label: 'Vermillion wash', value: 'rgba(200,67,31,0.22)' },
    { key: 'indigo', label: 'Indigo wash', value: 'rgba(39,73,109,0.20)' },
    { key: 'ochre', label: 'Ochre wash', value: 'rgba(176,125,43,0.22)' },
  ],
  defaultStyle: { stroke: '#221d18', fill: 'transparent', strokeWidth: 3, opacity: 1 },
};

/** Neutral, high-contrast palette for whiteboard-style apps. */
export const SLATE_PALETTE: Palette = {
  key: 'slate',
  label: 'Slate',
  strokes: [
    { key: 'black', label: 'Black', value: '#0f172a' },
    { key: 'red', label: 'Red', value: '#e11d48' },
    { key: 'blue', label: 'Blue', value: '#2563eb' },
    { key: 'green', label: 'Green', value: '#16a34a' },
    { key: 'amber', label: 'Amber', value: '#d97706' },
  ],
  fills: [
    { key: 'none', label: 'None', value: 'transparent' },
    { key: 'gray', label: 'Gray', value: 'rgba(15,23,42,0.10)' },
    { key: 'red', label: 'Red', value: 'rgba(225,29,72,0.16)' },
    { key: 'blue', label: 'Blue', value: 'rgba(37,99,235,0.16)' },
    { key: 'green', label: 'Green', value: 'rgba(22,163,74,0.16)' },
  ],
  defaultStyle: { stroke: '#0f172a', fill: 'transparent', strokeWidth: 2, opacity: 1 },
};

export const PALETTES: readonly Palette[] = [HANJI_PALETTE, SLATE_PALETTE];

export function getPalette(key: string): Palette | undefined {
  return PALETTES.find((p) => p.key === key);
}

/** Common stroke widths, for a width picker. */
export const STROKE_WIDTHS: readonly number[] = [1, 2, 3, 5, 8, 12, 20];

// ---------------------------------------------------------------- ui theme

/**
 * CSS custom properties for chrome (toolbars, panels) — NOT for canvas content.
 * Apply with `applyTheme(el, HANJI_THEME)` or just read the values and use
 * them in your own styled-components / Tailwind config / shadcn theme.
 */
export interface UITheme {
  key: string;
  label: string;
  vars: Record<string, string>;
}

export const HANJI_THEME: UITheme = {
  key: 'hanji',
  label: 'Hanji',
  vars: {
    '--dohwa-paper': '#f3ead8',
    '--dohwa-paper-deep': '#e9ddc4',
    '--dohwa-ink': '#221d18',
    '--dohwa-ink-soft': '#5c5246',
    '--dohwa-line': '#d6c8a8',
    '--dohwa-accent': '#c8431f',
    '--dohwa-panel': '#fbf6ea',
    '--dohwa-selection': '#4467ff',
    '--dohwa-radius': '14px',
    '--dohwa-shadow':
      '0 10px 30px rgba(60, 44, 20, 0.18), 0 2px 6px rgba(60, 44, 20, 0.10)',
  },
};

export const SLATE_THEME: UITheme = {
  key: 'slate',
  label: 'Slate',
  vars: {
    '--dohwa-paper': '#ffffff',
    '--dohwa-paper-deep': '#f1f5f9',
    '--dohwa-ink': '#0f172a',
    '--dohwa-ink-soft': '#64748b',
    '--dohwa-line': '#e2e8f0',
    '--dohwa-accent': '#2563eb',
    '--dohwa-panel': '#ffffff',
    '--dohwa-selection': '#2563eb',
    '--dohwa-radius': '10px',
    '--dohwa-shadow': '0 4px 16px rgba(15, 23, 42, 0.10)',
  },
};

export const THEMES: readonly UITheme[] = [HANJI_THEME, SLATE_THEME];

/** Write a theme's custom properties onto an element (usually :root or your app shell). */
export function applyTheme(el: HTMLElement, theme: UITheme): void {
  for (const [name, value] of Object.entries(theme.vars)) {
    el.style.setProperty(name, value);
  }
}
