# Building your own UI (React / Next.js)

dohwa ships **no UI components**. It exports the *material* you need to build one:
tool metadata, action metadata, palettes, themes, and a headless store.

```
dohwa            engine + pure geometry + SVG serialization
dohwa/ui         TOOL_METAS, ACTION_METAS, icons, createStore()
dohwa/presets    PALETTES, THEMES, applyTheme(), STROKE_WIDTHS
dohwa/nodes      pure node factories + validateScene()
```

---

## 1. Bind the engine + store

`createStore(app)` collapses the engine's granular events into one immutable
snapshot with `subscribe` / `getSnapshot` — exactly what `useSyncExternalStore` wants.

```tsx
// hooks/use-dohwa.ts
'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dohwa } from 'dohwa';
import { createStore, type DohwaStore, type DohwaUIState } from 'dohwa/ui';
import { HANJI_PALETTE } from 'dohwa/presets';

export function useDohwa() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [store, setStore] = useState<DohwaStore | null>(null);
  const appRef = useRef<Dohwa | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Dohwa(containerRef.current, {
      tool: 'pen',
      style: HANJI_PALETTE.defaultStyle,
    });
    appRef.current = app;
    const s = createStore(app);
    setStore(s);
    return () => {
      s.destroy();
      app.destroy();
    };
  }, []);

  return { containerRef, app: appRef.current, store };
}

export function useDohwaState(store: DohwaStore | null): DohwaUIState | null {
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => null),
    () => null, // SSR: no engine on the server
  );
}
```

## 2. Toolbar from metadata

No hardcoded button list. Add a tool to the engine and it appears here automatically.

```tsx
// components/toolbar.tsx
'use client';
import { TOOL_METAS, ICON_ATTRS } from 'dohwa/ui';
import type { Dohwa } from 'dohwa';
import type { DohwaStore } from 'dohwa/ui';
import { useDohwaState } from '@/hooks/use-dohwa';
import { Button } from '@/components/ui/button'; // shadcn
import { cn } from '@/lib/utils';

export function Toolbar({ app, store }: { app: Dohwa; store: DohwaStore }) {
  const state = useDohwaState(store);
  if (!state) return null;

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-2 shadow-lg">
      {TOOL_METAS.map((meta) => (
        <Button
          key={meta.key}
          variant={state.tool === meta.tool ? 'default' : 'ghost'}
          size="icon"
          title={`${meta.label}${meta.shortcut ? ` (${meta.shortcut.toUpperCase()})` : ''}`}
          onClick={() => app.setTool(meta.tool)}
        >
          <svg
            width={20}
            height={20}
            viewBox={ICON_ATTRS.viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth={ICON_ATTRS.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {meta.icon.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
        </Button>
      ))}
    </div>
  );
}
```

### Localizing labels

`meta.key` is a stable, non-localized string — use it to look up your own dictionary:

```tsx
const ko: Record<string, string> = { pen: '붓', eraser: '지우개', rect: '사각형' };
const label = ko[meta.key] ?? meta.label;
```

## 3. Action bar from metadata

`store.run(key)` and `store.canRun(key)` mean you never wire 20 handlers by hand —
`needsSelection` / `needsMultiSelection` are already encoded in the metadata.

```tsx
'use client';
import { ACTION_METAS, type ActionKey } from 'dohwa/ui';

const SHOWN: ActionKey[] = ['undo', 'redo', 'group', 'ungroup', 'flipH', 'delete'];

export function ActionBar({ store }: { store: DohwaStore }) {
  const state = useDohwaState(store);
  if (!state) return null;

  return (
    <div className="flex gap-1">
      {SHOWN.map((key) => {
        const meta = ACTION_METAS.find((a) => a.key === key)!;
        return (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            disabled={!store.canRun(key)}   // enablement comes from the store
            onClick={() => store.run(key)}  // one dispatcher, not 20 handlers
            title={meta.shortcut ? `${meta.label} (${meta.shortcut})` : meta.label}
          >
            {meta.label}
          </Button>
        );
      })}
    </div>
  );
}
```

## 4. Palettes & themes

Palettes are plain data. Ignore ours and pass your brand colors straight to `setStyle`.

```tsx
import { PALETTES, applyTheme, THEMES, STROKE_WIDTHS } from 'dohwa/presets';

// use a preset...
const palette = PALETTES.find((p) => p.key === 'slate')!;
palette.strokes.map((sw) => (
  <button key={sw.key} style={{ background: sw.value }}
          onClick={() => app.setStyle({ stroke: sw.value })} />
));

// ...or your own tokens — the engine has no opinion
app.setStyle({ stroke: 'var(--brand-600)', strokeWidth: 4 });

// UI chrome theming via CSS custom properties (--dohwa-*)
applyTheme(document.documentElement, THEMES.find((t) => t.key === 'slate')!);
```

## 5. Zustand instead of the built-in store

The engine is just an event emitter — bridge it to whatever you already use.

```ts
import { create } from 'zustand';
import type { Dohwa, Tool } from 'dohwa';

export const useBoard = create<{ tool: Tool; canUndo: boolean }>(() => ({
  tool: 'pen',
  canUndo: false,
}));

export function bindEngine(app: Dohwa) {
  const offs = [
    app.on('tool', (tool) => useBoard.setState({ tool: tool as Tool })),
    app.on('history', (h: any) => useBoard.setState({ canUndo: h.canUndo })),
  ];
  return () => offs.forEach((off) => off());
}
```

## 6. Server-side / AI-generated scenes

`dohwa/nodes` is DOM-free: build scenes in a route handler, in a test, or from
an LLM's JSON output — then validate before loading.

```ts
// app/api/diagram/route.ts
import { rect, text, arrow, group, scene, validateScene } from 'dohwa/nodes';
import { sceneToSVG, getAABB } from 'dohwa';

const box = rect({ x: 0, y: 0, w: 160, h: 60, rx: 8, style: { fill: '#eef' } });
const label = text({ x: 20, y: 18, text: 'Start', fontSize: 20 });
const flow = arrow({ x1: 160, y1: 30, x2: 260, y2: 30 });

const doc = scene([group([box, label]), flow]);

// LLM output? Validate it before it ever touches the canvas.
const check = validateScene(doc);
if (!check.valid) throw new Error(check.errors.join('; '));

return new Response(sceneToSVG(doc.nodes), {
  headers: { 'content-type': 'image/svg+xml' },
});
```

Client side, the same JSON just loads:

```ts
app.loadJSON(doc);
```

---

## Why no `<DohwaToolbar />` component?

A shipped component would need to guess your framework, your design system, your
icon set, and your i18n strategy — and every guess is a thing you'd have to fight.
Metadata + a store gives you the same 30 lines of assembly, with none of the fighting.
The demo (`demo/index.html`) builds its entire toolbar this way in vanilla JS, which
is the proof the API is sufficient.
