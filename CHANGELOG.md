# Changelog

이 파일은 dohwa의 버전별 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고,
버전 규칙은 [semver](https://semver.org/lang/ko/)를 따릅니다.

버전을 올리는 기준과 커밋 프리픽스 매핑은
[PUBLISHING.md](./PUBLISHING.md#3-versioning-semver)를 참고하세요.

---

## [Unreleased]

> `package.json`은 다음 릴리스 버전 **0.5.0**을 가리킵니다 (기능 추가 = minor).

### Added

- **이미지 조각 떼내기** — 크롭 창을 원본에 적용하는 대신, **새 이미지 조각으로
  들어올려** 따로 끌고 다닐 수 있습니다. 크롭 모드에서 `Shift+Enter`(또는 액션
  `extractCrop`)를 누르면 창 영역이 별도 노드로 떨어져 나오고 곧바로 선택되어
  바로 드래그할 수 있으며, **원본 이미지는 한 픽셀도 건드리지 않습니다**.
  조각은 같은 `src`에 자기 crop 창만 다르게 가진 진짜 이미지 노드라 — 픽셀 복사도
  래스터화도 없고 — `exportSVG`에서도 clipPath 벡터로 나갑니다. 같은 사진에서
  여러 조각을 떼어 콜라주처럼 배치할 수 있습니다.
  API: `extractCrop(): ImageNode | null` / `canExtractCrop()`.
- **최근 사용 색 & 컬러 피커** — 팔레트의 고정 5색에 갇히지 않고 아무 색이나 쓸 수
  있습니다. 스토어가 최근에 쓴 색을 **최대 10개**까지 기억하고(중복은 앞으로 끌어올림,
  `transparent`는 기록 안 함), 스냅샷의 `recentStrokes` / `recentFills`로 노출합니다.
  엔진은 여전히 위젯을 그리지 않습니다 — 피커는 소비자가 만들고, 데모가 네이티브
  `<input type="color">`와 최근 색 스와치 줄(클릭: 선 색 / Shift+클릭: 채움 색,
  localStorage에 보관)로 레퍼런스 구현을 보여줍니다. 순수 함수 `pushRecent` /
  `normalizeColor`(`#ABC`↔`#aabbcc` 중복 제거) / `isPaint`와 `RECENT_COLORS_MAX`를
  `dohwa/ui`에서 export하고, `store.setRecentColors()`로 지난 세션을 복원합니다.
- **필압 감지 스트로크** — 스타일러스로 그리면 필압에 따라 선 굵기가 변합니다.
  압력은 `StrokePoint.pressure`(0~1)로 점마다 기록되며, `Point`를 확장한 타입이라
  이동·스케일·반전 등 기존 지오메트리 연산이 값을 그대로 통과시킵니다. 캔버스는
  세그먼트별 굵기로, SVG는 세그먼트별 `<path>` 묶음으로 내보내고(가변 폭 stroke이
  없으므로), 히트 테스트도 세그먼트 굵기를 따릅니다. 압력이 없는 기존 스트로크는
  종전의 단일 부드러운 경로 그대로라 회귀가 없습니다. 실제 펜(`pointerType ===
  'pen'`)만 기록하므로 마우스·터치는 균일 폭을 유지합니다. 옵션 `pressure`(기본
  true), 순수 함수 `strokeWidthAt` / `segmentWidths` / `hasPressure`(`dohwa`).
- **자유 변형(스큐)** — 선택 프레임의 **모서리 중앙 핸들을 `Ctrl`(맥은 `Cmd`)로
  드래그하면 스큐**가 걸립니다. 위/아래 핸들을 좌우로 끌면 X축, 좌/우 핸들을
  위아래로 끌면 Y축으로 기울고, 잡은 모서리가 포인터를 그대로 따라옵니다.
  v0.4의 행렬 모델을 UI에서 처음으로 직접 쓰는 기능입니다. 다중 선택은 선택
  영역 중심을 기준으로 한 덩어리처럼 기울고, 회전된 노드는 화면에 보이는 방향
  기준으로 기웁니다. 레거시 `rotation` 필드는 결과 행렬에 접혀 보존됩니다.
  API: `skewSelection(skewX, skewY?)` / `transformSelection(matrix, pivot?)`,
  순수 함수 `skewFromEdgeDrag(box, edge, delta)`(`dohwa`).
- **객체 스냅 & 스마트 가이드** — 선택 객체를 드래그해 옮길 때 다른 객체의
  모서리·중심에 달라붙고, 정렬되는 지점에 분홍색 가이드선을 그립니다. 스냅 거리는
  화면 기준 6px이며 X·Y 축이 독립적으로 가장 가까운 선에 붙습니다. `Alt`를 누른
  채 드래그하면 일시적으로 꺼지고, 옵션 `snap`(기본 true) 또는
  `setSnapEnabled()`로 전역 제어합니다. 순수 함수 `snapMove(moving, targets,
  threshold)`(`dohwa`)로 스냅 계산과 가이드선을 얻을 수 있어 DOM 없이 테스트
  가능합니다. API: `isSnapEnabled()` / `setSnapEnabled(on)`.
- **정렬 & 분배** — 선택한 노드를 공통 모서리/중심에 맞추는 정렬(좌·우·수평중앙,
  상·하·수직중앙)과, 노드 사이 간격을 균등하게 벌리는 분배(가로/세로). 순수
  지오메트리라 DOM 없이 테스트 가능하며 회전·스큐된 노드도 world AABB 기준으로
  올바르게 처리됩니다. API: `alignSelection(mode)` / `distributeSelection(axis)`,
  순수 함수 `alignDeltas` / `distributeDeltas`(`dohwa`), 액션 메타 `alignLeft`·
  `alignHCenter`·`alignRight`·`alignTop`·`alignVCenter`·`alignBottom`·
  `distributeH`·`distributeV`(분배는 `minSelection: 3`).
- **z-order 한 단계 이동** — 기존 맨 앞/맨 뒤(`bringToFront`/`sendToBack`)에 더해
  한 칸씩 앞/뒤로 옮기는 `bringForward()` / `sendBackward()`. 연속 선택 블록은
  내부 순서를 유지한 채 함께 이동합니다. 순수 함수 `orderStep`(`dohwa`), 액션
  메타 `bringForward` / `sendBackward`.
- **이미지 잘라내기(크롭)** — `ImageNode.crop`(원본 대비 0~1 비율의 소스 창)과
  인터랙티브 크롭 에디터. 이미지 더블클릭 또는 액션바 ✂로 진입해 핸들로 자르고,
  안쪽을 드래그해 창 뒤의 이미지를 움직입니다. `Enter` 적용 / `Esc` 취소.
  비파괴적이라 원본이 유지되며, 캔버스 렌더·`exportPNG`·`exportSVG`(clipPath)
  모두 반영됩니다. API: `startCrop()` / `applyCrop()` / `cancelCrop()` /
  `canCrop()` / `isCropping()` / `getCroppingId()` / `setImageCrop(id, crop | null)`,
  이벤트 `'crop'` (id | null), 액션 메타 `'crop'`.
- **양방향 화살표** — `LineNode.arrowStart`와 `'arrow-both'` 툴. `A`를 한 번 더
  누르면 단방향↔양방향이 전환됩니다. `TOOL_METAS`에 `variantOf: 'arrow'`로
  표시되어, 툴바가 화살표 버튼의 서브메뉴(우클릭/길게 누르기)로 노출할 수
  있습니다. 팩토리는 `arrow({ both: true })` / `line({ arrowStart })`를 받습니다.
- **`SHORTCUT_SECTIONS`** (`dohwa/ui`) — 단축키 도움말 화면을 그대로 그릴 수 있는
  섹션·라벨·키 조합 데이터. 툴 항목은 `TOOL_METAS`에서 파생되어 서로 어긋나지
  않습니다. 데모는 이걸로 `?` 키 / ⌨ 버튼으로 여닫는 단축키 팝업을 만들고,
  기존 좌하단 힌트 박스를 대체했습니다.

### Changed

- script 태그용 IIFE 빌드(`dist/dohwa.global.js`)를 minify합니다. 136KB → 62KB
  (54% 감소). 브라우저가 직접 받는 파일이라 파일 크기가 곧 전송량입니다.
  ESM 엔트리(`index.js`, `ui.js` 등)는 의도적으로 minify하지 않습니다 —
  소비자 쪽 번들러가 처리하므로 크기 이득 없이 디버깅만 나빠집니다.
- demo의 버전 표기를 `package.json`에서 주입합니다. 기존에는
  `demo/template.html`에 하드코딩돼 있어 `v0.2.0`으로 4개 버전만큼
  뒤처져 있었습니다.

### Fixed

- **선택 없이 `setStyle()`을 호출하면 아무 이벤트도 발생하지 않아**, 스토어 스냅샷의
  `style`이 낡은 채로 남았습니다(툴바가 현재 색·굵기를 반영하지 못함). 새 `'style'`
  이벤트를 추가해 스타일만 바뀐 경우에도 UI가 갱신됩니다. `'change'`는 씬이 바뀐
  경우를 의미하므로 그대로 두고 별도 이벤트로 분리했습니다.
- `esbuild`를 devDependencies에 명시적으로 선언했습니다. 그동안 tsup의
  전이 의존성에 의존하고 있어, tsup이 esbuild 버전을 바꾸면 빌드가 조용히
  깨질 수 있었습니다.

---

## [0.4.0]

이 CHANGELOG의 기준선입니다.

0.4.0 및 그 이전 버전(0.1.0 ~ 0.3.0)의 변경 내역은 기록이 남아 있지 않습니다 —
해당 시점에는 CHANGELOG가 없었고 git 태그도 없어서, 각 버전에 무엇이
들어갔는지 재구성할 근거가 없습니다. 0.4.0 시점의 기능 전반은
[README.md](./README.md)와 [ARCHITECTURE.md](./ARCHITECTURE.md)가 설명합니다.

다음 릴리스부터 이 파일에 누적됩니다.