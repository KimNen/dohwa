> 한국어 문서는 [README.md](README.md)를 참고하세요.

# dohwa 圖畵

> **도화(圖畵)** — drawing paper. A **headless**, dependency-free canvas drawing engine.
> Freehand ink, shapes, text, images, rotation, grouping, replay — and **you** build the UI.

dohwa owns one `<canvas>` and exposes an imperative API + events. It ships **no components**:
instead it exports the *material* for building your own toolbar — tool metadata (with icons and
shortcuts), palettes, themes, and a framework-agnostic store. Scenes are plain JSON and the
geometry is DOM-free, so the same code runs in Node, in tests, or on a server.

## Packages

| import | what's in it | needs a DOM? |
| --- | --- | --- |
| `dohwa` | engine, pure geometry, SVG serialization | engine yes, geometry no |
| `dohwa/ui` | `TOOL_METAS`, `ACTION_METAS`, icons, `createStore()` | no |
| `dohwa/presets` | `PALETTES`, `THEMES`, `applyTheme()`, `STROKE_WIDTHS` | only `applyTheme` |
| `dohwa/nodes` | pure node factories + `validateScene()` | no |

Subpaths are separate entry points, so importing the engine doesn't pull in the palettes,
and a server route that only builds scenes never touches DOM code.

## Features

**Drawing**
- ✍️ Freehand pen with quadratic smoothing
- ⬛ Shapes — rectangle (`rx` rounded corners), ellipse, diamond, triangle, line, **arrow · double-headed arrow** (Shift = square / circle / 45° snap; press `A` again to toggle both heads)
- 🔤 **Text** — click to create, double-click to edit inline (floating textarea), multiline, font scaling on resize
- 🖼 Images — URL / `File` / drag & drop, horizontal·vertical flip, ✂️ **cropping** — double-click to enter, drag handles to trim and drag inside to slide the image, Enter applies / Esc cancels (non-destructive: the source is kept)

**Editing**
- 🧲 Selection — click, shift-click, marquee; move, 8-handle resize (Shift = keep ratio)
- 🔄 **Rotation** — rotation handle above the selection (Shift = 15° snap); multi-selection orbits around the common pivot; rotation-aware hit testing & AABB
- 🧽 **Eraser** — drag to delete objects
- 🗂 Grouping — group / ungroup (group rotation is baked into children on ungroup)
- 📐 **Align & distribute** — left/right/h-center, top/bottom/v-center align + even horizontal/vertical distribution (works on rotated/skewed nodes via world AABBs)
- 🔢 z-order — to front/back + one step forward/backward (contiguous selection blocks move together)
- ↔️ Flip horizontal / vertical, 🔒 lock / unlock, 📋 copy / cut / paste, arrow-key nudge (Shift = 10px)
- ↩️ Undo / redo — snapshot history

**Canvas & IO**
- 🔭 Infinite canvas — wheel zoom at cursor, pinch zoom, space-drag pan, zoom-to-fit
- 💾 `toJSON()` / `loadJSON()` — plain JSON scenes
- 🖼 `exportPNG()` with content auto-crop · 🎨 **`exportSVG()`** true vector export
- ▶️ **`replay()`** — replays the drawing chronology stroke-by-stroke (see below)
- ⌨️ Full keyboard shortcuts, HiDPI rendering, zero dependencies

## Install

```bash
npm i dohwa
```

Or drop the IIFE bundle in a script tag (exposes `window.Dohwa`):

```html
<script src="dist/dohwa.global.js"></script>
```

## Quick start

```ts
import { Dohwa } from 'dohwa';

const app = new Dohwa(document.querySelector('#stage')!, {
  tool: 'pen',
  style: { stroke: '#1c1917', strokeWidth: 3 },
  fontFamily: "'Gowun Batang', serif",
});

app.setTool('arrow');
app.addText('안녕, 도화!', { x: 100, y: 80 });
await app.addImage('/logo.png');

app.on('selection', (ids) => console.log('selected:', ids));
app.on('history', ({ canUndo, canRedo }) => { /* sync your toolbar */ });

const png = app.exportPNG({ scale: 2, background: '#fff' });
const svg = app.exportSVG();        // vector!
await app.replay({ fps: 6 });       // watch it being drawn again
```

### React (Next.js) usage

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { Dohwa } from 'dohwa';

export function Board() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const app = new Dohwa(ref.current, { tool: 'pen' });
    return () => app.destroy();
  }, []);

  return <div ref={ref} className="h-[600px] w-full" />;
}
```

## Bring your own UI

The engine never renders a toolbar. It gives you the data to build one — so the toolbar
matches *your* design system, framework, and language, not ours.

```ts
import { Dohwa } from 'dohwa';
import { TOOL_METAS, ACTION_METAS, createStore } from 'dohwa/ui';
import { PALETTES, applyTheme, THEMES } from 'dohwa/presets';

const app = new Dohwa(el, { tool: 'pen' });
const store = createStore(app);

// 1. tools are data — icons are SVG path strings for a 24x24 viewBox
TOOL_METAS.forEach((meta) => {
  // meta.tool 'pen' | meta.label 'Pen' | meta.shortcut 'p'
  // meta.icon ['M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z']
  // meta.key  — stable, non-localized: use it to look up your own i18n strings
  renderButton(meta, () => app.setTool(meta.tool));
});

// 2. actions carry their own enablement rules
store.canRun('group');   // false until 2+ nodes are selected
store.run('group');      // one dispatcher instead of 20 wired handlers

// 3. one snapshot drives the whole UI
store.subscribe(() => {
  const s = store.getSnapshot();
  // { tool, style, selectionCount, canUndo, canRedo, zoomPercent, isReplaying, ... }
});
```

`store.subscribe` / `store.getSnapshot` are shaped for React's `useSyncExternalStore`,
and bridge to Zustand, Vue `reactive`, or Svelte stores in a few lines.
See **[examples/react.md](examples/react.md)** for a full Next.js + shadcn/ui toolbar.

The demo builds its *entire* toolbar from `TOOL_METAS` + `createStore` in vanilla JS —
that's the proof the exported surface is actually sufficient.

## Palettes & themes

Colors are data too. Use ours, or ignore them entirely.

```ts
import { PALETTES, HANJI_PALETTE, applyTheme, THEMES, STROKE_WIDTHS } from 'dohwa/presets';

HANJI_PALETTE.strokes; // [{ key: 'ink', label: 'Ink', value: '#221d18' }, ...]
HANJI_PALETTE.fills;   // [{ key: 'none', value: 'transparent' }, ...]

// UI chrome theming — writes --dohwa-* CSS custom properties
applyTheme(document.documentElement, THEMES[0]);

// or just pass your own brand tokens; the engine has no opinion
app.setStyle({ stroke: 'var(--brand-600)', strokeWidth: 4 });
```

## Building scenes without a browser

`dohwa/nodes` and the geometry module are DOM-free — generate diagrams on a server,
assert on them in tests, or let an LLM emit scene JSON and validate it before loading.

```ts
import { rect, text, arrow, group, scene, validateScene } from 'dohwa/nodes';
import { sceneToSVG, getAABB, hitTestNode } from 'dohwa';

const doc = scene([
  group([
    rect({ x: 0, y: 0, w: 160, h: 60, rx: 8, style: { fill: '#eef' } }),
    text({ x: 20, y: 18, text: 'Start', fontSize: 20 }),
  ]),
  arrow({ x1: 160, y1: 30, x2: 260, y2: 30 }),
]);

validateScene(doc);        // { valid: true, errors: [] } — check untrusted/LLM input
sceneToSVG(doc.nodes);     // '<svg ...>' — render on the server, no canvas needed
getAABB(doc.nodes[0]);     // bbox math in a test
app.loadJSON(doc);         // and the same object loads in the browser
```


## Transforms & performance (v0.4)

Nodes carry an affine `transform` matrix `[a,b,c,d,e,f]` — translate, rotate,
**non-uniform scale, and skew** in one place, composing by multiplication.
Legacy `rotation`-field scenes still load unchanged; `nodeMatrix()` bridges both.

```ts
import { rect, compose, skewing } from 'dohwa/nodes';
rect({ x: 0, y: 0, w: 100, h: 40, transform: compose({ skewX: 0.3, scaleX: 2 }) });
```

A **quadtree spatial index** + **viewport culling** keep large scenes fast:
hit-testing thousands of path nodes is ~30–90× faster than a linear scan, and
off-screen nodes aren't drawn. Both are automatic past small-scene thresholds.
See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the design and benchmarks, and
`demo/bench.html` for a live comparison.

```ts
import { Quadtree, getAABB, ObjectCache } from 'dohwa';
const tree = Quadtree.build(nodes.map((n) => ({ id: n.id, box: getAABB(n) })));
tree.queryPoint(x, y);   // O(log n + k) broad-phase, not O(n)
```

## API

### `new Dohwa(container, options?)`

| option | type | default |
| --- | --- | --- |
| `tool` | `Tool` | `'pen'` |
| `style` | `Partial<Style>` | ink black, 3px |
| `background` | `string` | `'transparent'` |
| `fontFamily` / `fontSize` | `string` / `number` | `'sans-serif'` / `28` |
| `minZoom` / `maxZoom` | `number` | `0.1` / `8` |

`Tool` = `'select' | 'pen' | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'line' | 'arrow' | 'arrow-both' | 'text' | 'eraser' | 'pan'`

`'arrow-both'` is marked `variantOf: 'arrow'` in `TOOL_METAS` — a hint to toolbars to nest it
under the arrow button as a sub-menu (right-click / long-press). The demo is the reference
implementation of that pattern.

### Methods

| method | description |
| --- | --- |
| `setTool(tool)` / `getTool()` | switch tools |
| `setStyle(patch)` / `getStyle()` | style for new nodes; also applies to selection |
| `selectAll()` / `clearSelection()` / `getSelectedIds()` | selection |
| `deleteSelection()` / `duplicateSelection()` | edit |
| `copySelection()` / `cutSelection()` / `paste()` | clipboard |
| `group()` / `ungroup()` | grouping |
| `bringToFront()` / `sendToBack()` / `bringForward()` / `sendBackward()` | z-order |
| `alignSelection(mode)` / `distributeSelection(axis)` | align / distribute |
| `flipSelection('h' \| 'v')` | mirror |
| `lockSelection()` / `unlockAll()` / `hasLockedNodes()` | lock |
| `addText(text, at?, fontSize?)` / `startTextEdit(node)` | text |
| `addImage(src)` / `addImageFromFile(file)` | images |
| `startCrop()` / `applyCrop()` / `cancelCrop()` | interactive image crop (also: double-click an image) |
| `canCrop()` / `isCropping()` / `getCroppingId()` | crop state |
| `setImageCrop(id, crop \| null)` | programmatic crop — `crop` is `{x, y, w, h}` in 0..1 fractions of the source |
| `undo()` / `redo()` / `getHistoryState()` | history |
| `replay(opts?)` / `getTimeline()` / `isReplaying()` | drawing replay |
| `zoomIn()` / `zoomOut()` / `setZoom(s, anchor?)` / `zoomToFit()` / `resetView()` | viewport |
| `toJSON()` / `loadJSON(json)` / `exportPNG(opts?)` / `exportSVG(opts?)` | io |
| `getNodes()` / `clear()` / `destroy()` | misc |

### Events — `app.on(event, fn)`

`'change'` · `'selection'` (ids) · `'tool'` (tool) · `'history'` ({canUndo, canRedo}) · `'viewport'` (viewport) · `'textedit'` (id | null) · `'crop'` (id | null) · `'replay'` (boolean)

### Keyboard

`V` select · `P` pen · `R` rect · `O` ellipse · `D` diamond · `L` line · `A` arrow (again = both heads) · `T` text · `E` eraser · `H` pan · `Space` temp-pan ·
`Del` delete · `Ctrl+Z / Ctrl+Shift+Z` undo/redo · `Ctrl+G / Ctrl+Shift+G` group/ungroup ·
`Ctrl+C / X / V` copy/cut/paste · `Ctrl+D` duplicate · `Ctrl+A` select all · `Esc` deselect · `←↑→↓` nudge (Shift = 10px) ·
while cropping: `Enter` apply / `Esc` cancel

The complete map is exported as **`SHORTCUT_SECTIONS`** from `dohwa/ui` — sections, labels and
key chips as data, ready to render a shortcuts help screen (the demo's `?` popup is built from it).

## Replay — the signature feature

dohwa keeps an **append-only timeline** of every committed state, separate from the undo stack
(undo rewrites history; the timeline never forgets the real drawing order). `replay()` animates
the scene from the first stroke to the present — a built-in time-lapse of how a drawing was made.

```ts
await app.replay({ fps: 6 });
const frames = app.getTimeline(); // string[] of scene snapshots — build your own scrubber
```

## Scene format

Plain JSON — easy to persist, diff, or **generate programmatically / by an LLM**:

```json
{
  "app": "dohwa",
  "version": 1,
  "nodes": [
    { "id": "n1", "type": "path", "points": [{ "x": 0, "y": 0 }], "style": { "stroke": "#1c1917", "fill": "transparent", "strokeWidth": 3, "opacity": 1 } },
    { "id": "n2", "type": "text", "x": 40, "y": 20, "text": "도화", "fontSize": 30, "fontFamily": "serif", "w": 64, "h": 39, "style": { "...": "..." } },
    { "id": "n3", "type": "rect", "x": 0, "y": 0, "w": 100, "h": 60, "rotation": 0.3, "style": { "...": "..." } }
  ]
}
```

The geometry module (`getBBox`, `getAABB`, `hitTestNode`, `scaleNodeInto`, …) is pure and DOM-free —
you can validate, hit-test, and transform scenes on a server or in tests without a browser.

## Known limitations

- Resizing a **multi**-selection that contains rotated nodes scales their AABB approximately.
- Resizing a rotated single node anchors in local space (slight pivot drift vs. Figma-style anchoring).
- Text wrapping is manual (newlines); no auto-wrap width yet.

## Development

```bash
npm i
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> ESM + .d.ts, then the IIFE bundle
npm run demo        # demo/index.html (single file, bundle inlined)
npm test            # 125 assertions across matrix, geometry, spatial, cache, ui
```

## Roadmap

- [ ] Replay scrubber / export replay as GIF·WebM
- [ ] Pressure-sensitive strokes (PointerEvent.pressure)
- [ ] Pixel-level path eraser (split segments)
- [x] ~~Exported UI material (tool metadata, palettes, headless store)~~ — v0.3
- [ ] `@dohwa/react` bindings package (thin wrapper over `dohwa/ui`)
- [x] ~~Matrix transform model (non-uniform scale, skew, nested transforms)~~ — v0.4
- [x] ~~Spatial index + viewport culling for large scenes~~ — v0.4
- [ ] Free-transform gestures (skew/corner handles) writing matrices from the UI
- [ ] Wire ObjectCache into the default render path (needs visual regression)
- [ ] Layered canvases (static + interaction)
- [ ] Rich text (per-character styling), pattern/gradient fills
- [ ] Collaborative cursors (CRDT-friendly ops)

## License

MIT
