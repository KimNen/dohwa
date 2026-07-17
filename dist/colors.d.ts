/**
 * Recently-used color tracking — UI material, not scene data.
 *
 * The engine has no opinion about color and never renders a picker; a picker is
 * a widget, and dohwa ships no widgets. What a toolbar actually needs from us is
 * the *state*: which colors were used lately, deduped and capped. That's pure,
 * testable, and framework-free — build `<input type="color">` (or your own
 * picker) on top and feed the result to `app.setStyle()`.
 */
/** How many recent colors a toolbar typically shows. */
export declare const RECENT_COLORS_MAX = 10;
/**
 * Canonical form of a CSS color, used only to decide whether two entries are
 * the same swatch. Hex is lowercased and #abc is expanded to #aabbcc so the
 * same color typed two ways collapses to one entry; anything else (rgb(),
 * hsl(), var(--x), a named color) is just trimmed and lowercased.
 */
export declare function normalizeColor(color: string): string;
/** True when `color` is paint (so worth remembering), not 'transparent'/'none'. */
export declare function isPaint(color: string): boolean;
/**
 * `color` prepended to `list`, most-recent-first, deduped by normalized form
 * and capped at `max`. Re-using a color moves it to the front rather than
 * duplicating it. Returns a new array; `list` is never mutated. Non-paint
 * values ('transparent') return the list unchanged.
 */
export declare function pushRecent(list: readonly string[], color: string, max?: number): string[];
//# sourceMappingURL=colors.d.ts.map