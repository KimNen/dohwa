# Architecture: matrix geometry + performance layer (v0.4)

This release closes the two most fundamental gaps between dohwa and a
production-grade canvas library (Fabric/Konva class): a **matrix-based
transform model** and a **performance layer** (spatial index, viewport
culling, opt-in object caching).

## 1. Matrix transform model

### Before
Nodes carried a single `rotation?: number`. Bounding boxes and hit-tests
special-cased that one angle. This made three things structurally impossible:
non-uniform scale, skew, and correctly nesting a rotated child inside a
rotated parent.

### After
Every node may carry `transform?: Matrix` — a 6-element affine
`[a, b, c, d, e, f]`, the same convention as `CanvasRenderingContext2D` and
SVG `matrix()`. One matrix expresses translate + rotate + scale + skew, and
transforms compose by multiplication.

- `src/matrix.ts` — pure affine algebra: `compose`, `multiply`, `invert`,
  `decompose`, `applyToPoint`, `transformBBox`. 17 tests, incl. invert
  round-trips and compose/decompose symmetry.
- `nodeMatrix(node)` in `geometry.ts` is the **single bridge**: it resolves a
  node's effective matrix, pivoting on the node's own bbox center. Precedence
  is `transform` → legacy `rotation` → identity, so **every pre-existing scene
  still loads and renders identically** (verified by the unchanged v0.1–v0.3
  test suite).
- Hit-testing inverts the matrix (`toLocalPoint`) and tests in local space —
  one code path for rotation, scale, and skew alike.
- Rendering applies the matrix via `ctx.transform(...)`; SVG export emits
  `transform="matrix(...)"`.

### What this unlocks
Skew and non-uniform scale now work end to end (tested in
`test-transform.mjs`). Free-transform UI (skew handles, per-corner drag) and
deep nested-group transforms are now *expressible* — the remaining work is
wiring interaction gestures to write matrices instead of the legacy rotation
field. The data model no longer blocks them.

## 2. Performance layer

### Spatial index (`src/spatial.ts`)
A quadtree over world-space AABBs. Broad-phase point/box queries return only
the handful of candidates overlapping the query, instead of scanning every
node. Pure and brute-force-verified (400 items × 400 random queries match
exactly).

The engine keeps the index behind a **dirty flag**: it's rebuilt lazily on the
next query after any change, and consulted only past ~64 nodes (below that a
full scan is cheaper than the bookkeeping). `hitTopmost` walks only candidate
ids, ordered by z-index via an id→index map — no full-array pass.

**Measured** (offscreen, path nodes — the expensive hit-test case):

| nodes | brute-force | indexed | speedup |
| ---: | ---: | ---: | ---: |
| 500 | 0.049 ms | 0.005 ms | ~11× |
| 2,000 | 0.208 ms | 0.006 ms | ~33× |
| 8,000 | 1.022 ms | 0.011 ms | ~93× |

Brute-force is linear in scene size (1 ms/hit at 8k = jank on every
mouse-move); indexed stays near-constant. `demo/bench.html` reproduces this
live and lets you compare in-browser.

### Viewport culling (`Dohwa.render`)
On an infinite canvas most content is off-screen. Past ~200 nodes, `render`
queries the index for the visible world rectangle and draws only those nodes,
bounding per-frame cost by what's *in view* rather than scene size. Skipped
during active drags (the index is intentionally stale then).

### Object cache (`src/cache.ts`, opt-in)
Bitmap caching for expensive nodes (long paths, non-trivial groups): render
once to an offscreen canvas keyed by a content hash, then `drawImage` on
reuse. The cache-key logic is pure and tested — the hash **excludes**
transform/position (a moved or rotated node reuses its bitmap) and **includes**
style and geometry (an edit invalidates it). Exposed as `ObjectCache` for
callers who want it; not wired into the default render path yet, because
correct interaction with the matrix layer (avoiding double-applied transforms)
needs in-browser visual verification this environment can't provide.

## New public surface

```ts
// dohwa
import {
  compose, multiply, invert, decompose, applyToPoint, // matrix
  nodeMatrix, toLocalPoint, hasTransform, getAABB, rawBBox,
  Quadtree, ObjectCache, shouldCache, cacheKey,
} from 'dohwa';

// dohwa/nodes — build transformed scenes on a server / from an LLM
import { rect, compose, scaling, skewing } from 'dohwa/nodes';
rect({ x: 0, y: 0, w: 100, h: 40, transform: compose({ skewX: 0.3, scaleX: 2 }) });
```

## Test coverage

99 assertions across matrix algebra, transform geometry, quadtree correctness,
cache keys, core geometry/history/SVG, and UI material. Run with `npm test`.

## Deliberately deferred

- Free-transform gestures (skew/corner handles) writing matrices from the UI.
- Wiring `ObjectCache` into the default render path (needs visual regression).
- Layered canvases (static + interaction) to avoid content repaint on hover.
- Rich text (`IText`-style per-character styling), pattern/gradient fills.

These are follow-ons; the data model and performance primitives they build on
are now in place.
