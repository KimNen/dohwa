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
export const RECENT_COLORS_MAX = 10;

/** Values that name "no paint" rather than a color — never recorded as recent. */
const NON_COLORS = new Set(['transparent', 'none', '']);

/**
 * Canonical form of a CSS color, used only to decide whether two entries are
 * the same swatch. Hex is lowercased and #abc is expanded to #aabbcc so the
 * same color typed two ways collapses to one entry; anything else (rgb(),
 * hsl(), var(--x), a named color) is just trimmed and lowercased.
 */
export function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const shortA = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  if (shortA) {
    return `#${shortA[1]}${shortA[1]}${shortA[2]}${shortA[2]}${shortA[3]}${shortA[3]}${shortA[4]}${shortA[4]}`;
  }
  return c.replace(/\s+/g, '');
}

/** True when `color` is paint (so worth remembering), not 'transparent'/'none'. */
export function isPaint(color: string): boolean {
  return !NON_COLORS.has(color.trim().toLowerCase());
}

/**
 * `color` prepended to `list`, most-recent-first, deduped by normalized form
 * and capped at `max`. Re-using a color moves it to the front rather than
 * duplicating it. Returns a new array; `list` is never mutated. Non-paint
 * values ('transparent') return the list unchanged.
 */
export function pushRecent(
  list: readonly string[],
  color: string,
  max: number = RECENT_COLORS_MAX,
): string[] {
  if (!isPaint(color)) return [...list];
  const key = normalizeColor(color);
  const rest = list.filter((c) => normalizeColor(c) !== key);
  return [color, ...rest].slice(0, Math.max(0, max));
}
