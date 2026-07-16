> Read this in [English](README.en.md).

# dohwa 圖畵

> **도화(圖畵)** — 그림을 그리는 종이. 의존성 없는 **헤드리스(headless)** 캔버스 드로잉 엔진.
> 자유곡선 잉크, 도형, 텍스트, 이미지, 회전, 그룹핑, 리플레이 — UI는 **당신**이 만듭니다.

dohwa는 `<canvas>` 하나를 소유하고 명령형 API와 이벤트를 제공합니다. **컴포넌트는 제공하지 않습니다**.
대신 여러분이 직접 툴바를 만들 수 있도록 *재료*를 내보냅니다 — 아이콘과 단축키가 포함된 툴 메타데이터,
팔레트, 테마, 그리고 프레임워크에 종속되지 않는 스토어까지. 씬(scene)은 순수 JSON이고 지오메트리
모듈은 DOM에 의존하지 않아서, 같은 코드가 Node·테스트·서버 어디서든 동일하게 동작합니다.

## 패키지 구성

| import | 내용 | DOM 필요? |
| --- | --- | --- |
| `dohwa` | 엔진, 순수 지오메트리, SVG 직렬화 | 엔진은 필요, 지오메트리는 불필요 |
| `dohwa/ui` | `TOOL_METAS`, `ACTION_METAS`, 아이콘, `createStore()` | 불필요 |
| `dohwa/presets` | `PALETTES`, `THEMES`, `applyTheme()`, `STROKE_WIDTHS` | `applyTheme`만 필요 |
| `dohwa/nodes` | 순수 노드 팩토리 + `validateScene()` | 불필요 |

서브패스가 각각 독립된 엔트리포인트라서, 엔진만 import해도 팔레트까지 딸려오지 않고
씬만 생성하는 서버 라우트는 DOM 관련 코드를 전혀 건드리지 않습니다.

## 기능

**드로잉**
- ✍️ 2차 베지어로 부드럽게 처리되는 자유곡선 펜
- ⬛ 도형 — 사각형(`rx` 모서리 둥글기), 타원, 다이아몬드, 삼각형, 직선, **화살표 · 양방향 화살표** (Shift = 정사각형 / 정원 / 45° 스냅, `A`를 한 번 더 누르면 양방향 전환)
- 🔤 **텍스트** — 클릭해서 생성, 더블클릭으로 인라인 편집(플로팅 텍스트에어리어), 여러 줄, 리사이즈 시 폰트 크기 자동 조정
- 🖼 이미지 — URL / `File` / 드래그 앤 드롭, 좌우·상하 반전, ✂️ **잘라내기(크롭)** — 더블클릭으로 진입, 핸들 드래그로 자르고 안쪽 드래그로 이미지 이동, Enter 적용 / Esc 취소 (원본은 유지되어 언제든 되돌릴 수 있음)

**편집**
- 🧲 선택 — 클릭, Shift-클릭, 마키(드래그 선택); 이동, 8-핸들 리사이즈 (Shift = 비율 유지)
- 🔄 **회전** — 선택 영역 위의 회전 핸들(Shift = 15° 스냅); 다중 선택 시 공통 피벗을 중심으로 회전; 회전을 고려한 히트 테스트 & AABB
- 🧽 **지우개** — 드래그해서 객체 삭제
- 🗂 그룹핑 — 그룹 / 그룹 해제 (그룹 해제 시 그룹 회전값이 자식 노드에 반영됨)
- ↔️ 좌우/상하 반전, 🔒 잠금 / 잠금 해제, 📋 복사 / 잘라내기 / 붙여넣기, 방향키 이동 (Shift = 10px)
- ↩️ 실행 취소 / 다시 실행 — 스냅샷 히스토리

**캔버스 & 입출력**
- 🔭 무한 캔버스 — 커서 위치 기준 휠 줌, 핀치 줌, 스페이스+드래그 팬, 화면에 맞추기
- 💾 `toJSON()` / `loadJSON()` — 순수 JSON 씬
- 🖼 콘텐츠 자동 크롭이 적용된 `exportPNG()` · 🎨 진짜 벡터로 내보내는 **`exportSVG()`**
- ▶️ **`replay()`** — 그려진 순서 그대로 스트로크 단위로 재생 (아래 참고)
- ⌨️ 전체 키보드 단축키, HiDPI 렌더링, 의존성 제로

## 설치

```bash
npm i dohwa
```

또는 스크립트 태그에 IIFE 번들을 바로 넣어도 됩니다 (`window.Dohwa`로 노출됨):

```html
<script src="dist/dohwa.global.js"></script>
```

## 빠른 시작

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
app.on('history', ({ canUndo, canRedo }) => { /* 툴바 상태 동기화 */ });

const png = app.exportPNG({ scale: 2, background: '#fff' });
const svg = app.exportSVG();        // 진짜 벡터!
await app.replay({ fps: 6 });       // 그려지는 과정을 다시 재생
```

### React (Next.js) 사용 예

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

## 직접 만드는 UI

엔진은 툴바를 그려주지 않습니다. 대신 툴바를 만들 수 있는 데이터를 제공해서,
결과물이 dohwa가 아니라 *당신의* 디자인 시스템, 프레임워크, 언어를 따르게 합니다.

```ts
import { Dohwa } from 'dohwa';
import { TOOL_METAS, ACTION_METAS, createStore } from 'dohwa/ui';
import { PALETTES, applyTheme, THEMES } from 'dohwa/presets';

const app = new Dohwa(el, { tool: 'pen' });
const store = createStore(app);

// 1. 툴은 데이터입니다 — 아이콘은 24x24 viewBox 기준 SVG path 문자열
TOOL_METAS.forEach((meta) => {
  // meta.tool 'pen' | meta.label 'Pen' | meta.shortcut 'p'
  // meta.icon ['M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z']
  // meta.key  — 고정된, 지역화되지 않은 키: 여기에 맞춰 자체 i18n 문자열을 매핑
  renderButton(meta, () => app.setTool(meta.tool));
});

// 2. 액션은 자체적으로 활성화 규칙을 가짐
store.canRun('group');   // 노드가 2개 이상 선택되기 전까지 false
store.run('group');      // 20개의 개별 핸들러 대신 디스패처 하나로 처리

// 3. 스냅샷 하나가 UI 전체를 구동
store.subscribe(() => {
  const s = store.getSnapshot();
  // { tool, style, selectionCount, canUndo, canRedo, zoomPercent, isReplaying, ... }
});
```

`store.subscribe` / `store.getSnapshot`은 React의 `useSyncExternalStore`에 맞는 형태이고,
몇 줄만 추가하면 Zustand, Vue `reactive`, Svelte 스토어에도 연결할 수 있습니다.
Next.js + shadcn/ui로 만든 전체 툴바 예시는 **[examples/react.md](examples/react.md)**를 참고하세요.

데모 페이지는 순수 바닐라 JS로 `TOOL_METAS` + `createStore`만 가지고 툴바 *전체*를 만듭니다 —
export된 표면만으로 충분하다는 걸 보여주는 증거입니다.

## 팔레트 & 테마

색상도 데이터입니다. 제공된 걸 쓰거나, 완전히 무시해도 됩니다.

```ts
import { PALETTES, HANJI_PALETTE, applyTheme, THEMES, STROKE_WIDTHS } from 'dohwa/presets';

HANJI_PALETTE.strokes; // [{ key: 'ink', label: 'Ink', value: '#221d18' }, ...]
HANJI_PALETTE.fills;   // [{ key: 'none', value: 'transparent' }, ...]

// UI 크롬 테마 적용 — --dohwa-* CSS 커스텀 프로퍼티를 씀
applyTheme(document.documentElement, THEMES[0]);

// 아니면 그냥 자체 브랜드 토큰을 넘겨도 됨; 엔진은 색상에 대해 아무 주장도 하지 않음
app.setStyle({ stroke: 'var(--brand-600)', strokeWidth: 4 });
```

## 브라우저 없이 씬 만들기

`dohwa/nodes`와 지오메트리 모듈은 DOM에 의존하지 않습니다 — 서버에서 다이어그램을 생성하거나,
테스트에서 단정문을 작성하거나, LLM이 만든 씬 JSON을 로드 전에 검증할 수 있습니다.

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

validateScene(doc);        // { valid: true, errors: [] } — 신뢰할 수 없는/LLM 입력 검증
sceneToSVG(doc.nodes);     // '<svg ...>' — 캔버스 없이 서버에서 렌더링
getAABB(doc.nodes[0]);     // 테스트에서 bbox 계산
app.loadJSON(doc);         // 같은 객체를 브라우저에서도 그대로 로드
```


## 트랜스폼 & 성능 (v0.4)

노드는 어파인 `transform` 행렬 `[a,b,c,d,e,f]`을 가지고 있어서 — 이동, 회전,
**비균등 스케일, 스큐**까지 하나의 값으로 표현하고 곱셈으로 합성됩니다.
기존 `rotation` 필드 기반 씬도 그대로 로드되며, `nodeMatrix()`가 둘 사이를 연결합니다.

```ts
import { rect, compose, skewing } from 'dohwa/nodes';
rect({ x: 0, y: 0, w: 100, h: 40, transform: compose({ skewX: 0.3, scaleX: 2 }) });
```

**쿼드트리 공간 인덱스** + **뷰포트 컬링**이 대규모 씬에서도 속도를 유지해줍니다:
수천 개의 path 노드 히트 테스트가 선형 탐색보다 약 30~90배 빠르고,
화면 밖 노드는 그리지 않습니다. 둘 다 씬 크기가 일정 임계값을 넘으면 자동으로 적용됩니다.
설계와 벤치마크는 **[ARCHITECTURE.md](ARCHITECTURE.md)**를, 실시간 비교는
`demo/bench.html`을 참고하세요.

```ts
import { Quadtree, getAABB, ObjectCache } from 'dohwa';
const tree = Quadtree.build(nodes.map((n) => ({ id: n.id, box: getAABB(n) })));
tree.queryPoint(x, y);   // O(n) 전수 조사가 아닌 O(log n + k) 광역 조회
```

## API

### `new Dohwa(container, options?)`

| 옵션 | 타입 | 기본값 |
| --- | --- | --- |
| `tool` | `Tool` | `'pen'` |
| `style` | `Partial<Style>` | 검은 잉크, 3px |
| `background` | `string` | `'transparent'` |
| `fontFamily` / `fontSize` | `string` / `number` | `'sans-serif'` / `28` |
| `minZoom` / `maxZoom` | `number` | `0.1` / `8` |

`Tool` = `'select' | 'pen' | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'line' | 'arrow' | 'arrow-both' | 'text' | 'eraser' | 'pan'`

`'arrow-both'`는 `TOOL_METAS`에서 `variantOf: 'arrow'`로 표시됩니다 — 툴바에서 화살표 버튼의
서브메뉴(우클릭/길게 누르기)로 노출하라는 힌트입니다. 데모가 이 패턴의 레퍼런스 구현입니다.

### 메서드

| 메서드 | 설명 |
| --- | --- |
| `setTool(tool)` / `getTool()` | 툴 전환 |
| `setStyle(patch)` / `getStyle()` | 새 노드에 적용될 스타일; 선택된 노드에도 적용 |
| `selectAll()` / `clearSelection()` / `getSelectedIds()` | 선택 |
| `deleteSelection()` / `duplicateSelection()` | 편집 |
| `copySelection()` / `cutSelection()` / `paste()` | 클립보드 |
| `group()` / `ungroup()` | 그룹핑 |
| `bringToFront()` / `sendToBack()` | z-order |
| `flipSelection('h' \| 'v')` | 반전 |
| `lockSelection()` / `unlockAll()` / `hasLockedNodes()` | 잠금 |
| `addText(text, at?, fontSize?)` / `startTextEdit(node)` | 텍스트 |
| `addImage(src)` / `addImageFromFile(file)` | 이미지 |
| `startCrop()` / `applyCrop()` / `cancelCrop()` | 인터랙티브 이미지 크롭 (이미지 더블클릭으로도 진입) |
| `canCrop()` / `isCropping()` / `getCroppingId()` | 크롭 상태 |
| `setImageCrop(id, crop \| null)` | 프로그래밍 방식 크롭 — `crop`은 원본 대비 0~1 비율 `{x, y, w, h}` |
| `undo()` / `redo()` / `getHistoryState()` | 히스토리 |
| `replay(opts?)` / `getTimeline()` / `isReplaying()` | 드로잉 리플레이 |
| `zoomIn()` / `zoomOut()` / `setZoom(s, anchor?)` / `zoomToFit()` / `resetView()` | 뷰포트 |
| `toJSON()` / `loadJSON(json)` / `exportPNG(opts?)` / `exportSVG(opts?)` | 입출력 |
| `getNodes()` / `clear()` / `destroy()` | 기타 |

### 이벤트 — `app.on(event, fn)`

`'change'` · `'selection'` (ids) · `'tool'` (tool) · `'history'` ({canUndo, canRedo}) · `'viewport'` (viewport) · `'textedit'` (id | null) · `'crop'` (id | null) · `'replay'` (boolean)

### 키보드

`V` 선택 · `P` 펜 · `R` 사각형 · `O` 타원 · `D` 다이아몬드 · `L` 직선 · `A` 화살표 (한 번 더 = 양방향) · `T` 텍스트 · `E` 지우개 · `H` 팬 · `Space` 임시 팬 ·
`Del` 삭제 · `Ctrl+Z / Ctrl+Shift+Z` 실행 취소/다시 실행 · `Ctrl+G / Ctrl+Shift+G` 그룹/그룹 해제 ·
`Ctrl+C / X / V` 복사/잘라내기/붙여넣기 · `Ctrl+D` 복제 · `Ctrl+A` 전체 선택 · `Esc` 선택 해제 · `←↑→↓` 이동 (Shift = 10px) ·
크롭 중 `Enter` 적용 / `Esc` 취소

전체 목록은 `dohwa/ui`의 **`SHORTCUT_SECTIONS`**로 export됩니다 — 섹션·라벨·키 조합이 담긴
데이터라서 단축키 도움말 화면을 그대로 그릴 수 있습니다 (데모의 `?` 팝업이 이걸로 만들어졌습니다).

## 리플레이 — 대표 기능

dohwa는 실행 취소 스택과는 별개로, 커밋된 모든 상태를 담는 **추가 전용(append-only) 타임라인**을
유지합니다 (실행 취소는 히스토리를 재작성하지만, 타임라인은 실제로 그려진 순서를 절대 잊지 않습니다).
`replay()`는 첫 스트로크부터 현재까지 씬을 애니메이션으로 재생합니다 — 그림이 어떻게 그려졌는지
보여주는 내장 타임랩스 기능입니다.

```ts
await app.replay({ fps: 6 });
const frames = app.getTimeline(); // 씬 스냅샷의 string[] — 원하는 스크러버를 직접 구현 가능
```

## 씬 포맷

순수 JSON — 저장하거나, diff를 뜨거나, **프로그래밍적으로 / LLM으로 생성**하기 쉽습니다:

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

지오메트리 모듈(`getBBox`, `getAABB`, `hitTestNode`, `scaleNodeInto`, …)은 순수하고 DOM에
의존하지 않아서 — 브라우저 없이도 서버나 테스트에서 씬을 검증·히트 테스트·트랜스폼할 수 있습니다.

## 알려진 한계

- 회전된 노드가 포함된 **다중** 선택을 리사이즈하면 AABB 기준으로 근사 계산됩니다.
- 회전된 단일 노드를 리사이즈하면 로컬 좌표계 기준으로 앵커링됩니다 (Figma 방식 앵커링과는 피벗이 약간 다릅니다).
- 텍스트 줄바꿈은 수동(개행 문자)입니다. 자동 줄바꿈 너비는 아직 없습니다.

## 개발

```bash
npm i
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> ESM + .d.ts, 이후 IIFE 번들
npm run demo        # demo/index.html (단일 파일, 번들 인라인)
npm test            # matrix, geometry, spatial, cache, ui 등 125개 단정문
```

## 로드맵

- [ ] 리플레이 스크러버 / GIF·WebM으로 리플레이 내보내기
- [ ] 필압 감지 스트로크 (PointerEvent.pressure)
- [ ] 픽셀 단위 경로 지우개 (세그먼트 분할)
- [x] ~~UI 재료 export (툴 메타데이터, 팔레트, 헤드리스 스토어)~~ — v0.3
- [ ] `@dohwa/react` 바인딩 패키지 (`dohwa/ui`의 얇은 래퍼)
- [x] ~~행렬 트랜스폼 모델 (비균등 스케일, 스큐, 중첩 트랜스폼)~~ — v0.4
- [x] ~~공간 인덱스 + 대규모 씬을 위한 뷰포트 컬링~~ — v0.4
- [ ] UI에서 행렬을 직접 다루는 자유 변형 제스처 (스큐/코너 핸들)
- [ ] ObjectCache를 기본 렌더 경로에 연결 (시각적 회귀 테스트 필요)
- [ ] 레이어드 캔버스 (정적 + 인터랙션)
- [ ] 리치 텍스트 (글자별 스타일링), 패턴/그라디언트 채우기
- [ ] 협업 커서 (CRDT 친화적 오퍼레이션)

## 라이선스

MIT
