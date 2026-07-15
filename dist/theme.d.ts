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
export declare const HANJI_PALETTE: Palette;
/** Neutral, high-contrast palette for whiteboard-style apps. */
export declare const SLATE_PALETTE: Palette;
export declare const PALETTES: readonly Palette[];
export declare function getPalette(key: string): Palette | undefined;
/** Common stroke widths, for a width picker. */
export declare const STROKE_WIDTHS: readonly number[];
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
export declare const HANJI_THEME: UITheme;
export declare const SLATE_THEME: UITheme;
export declare const THEMES: readonly UITheme[];
/** Write a theme's custom properties onto an element (usually :root or your app shell). */
export declare function applyTheme(el: HTMLElement, theme: UITheme): void;
//# sourceMappingURL=theme.d.ts.map