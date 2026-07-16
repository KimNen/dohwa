# Changelog

이 파일은 dohwa의 버전별 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고,
버전 규칙은 [semver](https://semver.org/lang/ko/)를 따릅니다.

버전을 올리는 기준과 커밋 프리픽스 매핑은
[PUBLISHING.md](./PUBLISHING.md#3-versioning-semver)를 참고하세요.

---

## [Unreleased]

### Added

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