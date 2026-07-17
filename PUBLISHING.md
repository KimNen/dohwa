# Publishing dohwa to npm

dohwa is published to the **npm registry**. "npm" and "pnpm" aren't two
registries — they're two package managers that both read from and publish to
the same npmjs.com registry. So there's one place to publish (npm), and
consumers can install it with npm, pnpm, yarn, or bun interchangeably.

You publish with **either** the `npm` CLI **or** `pnpm publish`. Pick one.

---

## 0. One-time setup

### Fill in the placeholders

`package.json` currently has `USER` placeholders and an empty `author`. Before
the first publish, set:

- `"author"` — your name / email
- `"repository".url`, `"homepage"`, `"bugs".url` — your real GitHub URLs

### Check the name is available

The name `dohwa` must be free on npm (you checked the registry earlier, but
confirm at publish time):

```bash
npm view dohwa       # 404 = available; anything else = taken
```

If it's taken, either pick another name or publish under a scope you own:
`@yourname/dohwa` (scoped names are almost always available).

### Create + verify an npm account

```bash
npm adduser          # or: npm login   (opens browser on newer npm)
npm whoami           # confirms you're logged in
```

Enable 2FA on your npm account (Settings → Two-Factor Auth). For publishing,
"Authorization and writes" level is recommended — npm will then prompt for a
one-time code on every publish.

---

## 1. Pre-flight (do this every release)

```bash
npm run typecheck    # tsc --noEmit
npm run build        # tsup -> dist/ (ESM + .d.ts + IIFE)
npm test             # 99 assertions
```

Then inspect **exactly** what will ship — this is the single most important
check. It catches "oops I shipped my whole src tree" and "oops dist is empty":

```bash
npm pack --dry-run
```

You should see `LICENSE`, `README.md`, and `dist/**` — nothing from `src/`,
`scripts/`, or `demo/` (those are excluded via the `files` field +
`.npmignore`). The `files` allowlist in `package.json` is the source of truth;
`.npmignore` is a backstop.

`prepublishOnly` in `package.json` re-runs typecheck + build + test
automatically on publish, so even if you skip the manual pre-flight, a broken
build can't be published.

---

## 2a. Publish with npm

```bash
npm publish
```

For a **scoped** package (`@yourname/dohwa`), scoped packages default to
private, so the first publish must be explicitly public:

```bash
npm publish --access public
```

(We already set `"publishConfig": { "access": "public" }` in package.json, so
this is handled — but know why it's there.)

With 2FA on, npm prompts for your OTP. Done — it's live at
`https://www.npmjs.com/package/dohwa`.

## 2b. Publish with pnpm

Identical result, pnpm's CLI:

```bash
pnpm publish
```

Two pnpm-specific notes:

- pnpm **runs `prepublishOnly` and refuses to publish from a dirty git working
  tree by default**. Commit your changes first, or pass `--no-git-checks` if
  you really mean to publish uncommitted work (not recommended).
- If you use a pnpm **workspace/monorepo** later, `pnpm publish -r` publishes
  every package whose version isn't already on the registry.

---

## 3. Versioning (semver)

dohwa is pre-1.0, so the rules are looser, but be consistent:

- **patch** (`0.4.0 → 0.4.1`) — bug fixes, no API change
- **minor** (`0.4.0 → 0.5.0`) — new features, backward-compatible
- **major** (`0.4.0 → 1.0.0`) — breaking changes

### 커밋 프리픽스 → 범프

어떤 범프인지는 커밋 프리픽스로 판단합니다. 한 릴리스에 여러 커밋이 섞여
있으면 **가장 큰 범프 하나**가 이깁니다 — `Feat:` 5개와 `Break:` 1개가
쌓였으면 major입니다.

| 커밋 프리픽스   | 범프  | 의미                                  |
| --------------- | ----- | ------------------------------------- |
| `Break:`        | major | 기존 사용자의 코드가 깨지는 변경      |
| `Feat:`         | minor | 새 기능, 하위 호환 유지               |
| `Patch:` `Fix:` | patch | 버그 수정, 공개 API 변화 없음         |
| `Refact:`       | patch | 내부 구조 변경, 동작·API 동일         |
| `Docs:` `Chore:`| 없음  | 문서/빌드/설정 — 단독으로는 릴리스 없음 |

판단 기준은 커밋 프리픽스가 아니라 **소비자에게 무엇이 보이는가**입니다.
`Refact:`로 시작했더라도 export 이름이 바뀌었다면 그건 `Break:`입니다.
프리픽스는 그 판단을 기록하는 수단이지, 판단 자체를 대신하지 않습니다.

### 버전은 package.json이 기준입니다

이 저장소는 **`package.json`의 `version`이 곧 현재 버전**입니다. 기능이나 수정을
넣을 때 그 커밋에서 **직접 올리고**, 같은 커밋에서 [CHANGELOG.md](./CHANGELOG.md)의
`## [Unreleased]`에 항목을 추가합니다. 그래서 `package.json`은 *아직 배포되지 않은*
진행 중인 버전을 가리킵니다 (데모가 이 값을 주입하므로 `npm run demo`에 그대로
반영됩니다).

한 버전에 여러 커밋이 쌓이는 게 정상입니다. 이미 0.5.0으로 올려둔 상태에서 `Feat:`
커밋이 또 들어와도 0.6.0으로 올리지 마세요 — **아직 0.5.0을 내보내지 않았다면 그
기능도 0.5.0의 일부**입니다. 범프는 "이번에 내보낼 버전이 무엇인가"를 정하는
것이지 커밋 수를 세는 게 아닙니다.

> **`npm version`은 쓰지 마세요.** 그 명령은 package.json이 *마지막으로 배포된*
> 버전을 가리킨다고 전제하고 한 단계 더 올립니다. 여기서는 이미 목표 버전으로
> 올려둔 상태라 0.5.0에서 `npm version minor`를 돌리면 0.6.0으로 튑니다.
> git 태그도 쓰지 않습니다 — 버전 구분은 package.json 하나로 합니다.

### 릴리스할 때

```bash
# 1. CHANGELOG의 [Unreleased]를 이번 버전 번호로 옮기고 날짜를 적는다
#    ## [Unreleased]  ->  ## [0.5.0] - 2026-07-17
#    (그 위에 새 빈 [Unreleased]를 만들어 둔다)

# 2. package.json version이 그 번호와 같은지 확인
grep '"version"' package.json

# 3. 검증 + 배포 (prepublishOnly가 typecheck·build·test를 모두 돌린다)
npm publish
```

배포 후 다음 기능을 넣을 때, 그 커밋에서 `package.json`을 다음 번호로 올리며
새 주기를 시작합니다.

### Pre-releases

`latest`(그냥 `npm i dohwa`로 받는 것)를 건드리지 않고 미리보기를 내보내려면,
`package.json`을 직접 `0.5.0-beta.0`처럼 적고:

```bash
npm publish --tag beta    # npm i dohwa@beta 로만 설치됨
```

---

## 4. If something goes wrong

- **Published a broken version?** You can't re-publish the same version number
  ever. Bump a patch and publish again.
- **Published a secret / totally broken?** `npm unpublish dohwa@0.4.1` works
  only within 72 hours and only if nothing depends on it. Prefer
  `npm deprecate dohwa@0.4.1 "broken, use 0.4.2"` instead.
- **Wrong files shipped?** Fix the `files` field, bump patch, re-publish, then
  `npm deprecate` the bad version.

---

## 5. Recommended: automate with GitHub Actions

Manual publishing is error-prone. A release workflow can publish for you using
an npm **automation token** (Settings → Access Tokens → Granular → Automation,
which bypasses 2FA for CI).

이 저장소는 git 태그를 쓰지 않으므로, 태그 push 대신 **수동 실행
(`workflow_dispatch`)** 으로 트리거합니다 — Actions 탭에서 버튼을 눌러 배포하고,
배포되는 버전은 `package.json`에 적힌 값입니다. (나중에 태그를 도입하기로
바꾸면 `on: push: tags: ['v*']`로 바꾸면 됩니다.)

```yaml
# .github/workflows/release.yml
name: release
on:
  workflow_dispatch:          # Actions 탭에서 수동 실행
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # for npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm publish --no-git-checks --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` (the automation token) to the repo's Actions secrets. Then
releasing is: package.json 버전과 CHANGELOG를 정리해 push하고, Actions 탭에서
release 워크플로를 **Run workflow**로 실행하면 CI가 배포합니다.

`--provenance` attaches a signed, verifiable link from the npm package back to
the exact GitHub commit + workflow that built it — a strong supply-chain signal
that shows a "Provenance" badge on the npm page. It requires `id-token: write`
(above) and a public repo.

---

## Quick reference

```bash
# first time
npm login && npm whoami
npm view dohwa                 # confirm name is free

# every release
npm run build && npm test
npm pack --dry-run             # verify tarball contents
# package.json version은 기능 커밋에서 이미 올려둔 상태 — 여기서 또 올리지 않는다
# (npm version 금지: 0.5.0에서 돌리면 0.6.0으로 튄다)
grep '"version"' package.json  # 이번에 내보낼 번호가 맞는지 확인
# CHANGELOG.md: [Unreleased] -> ## [그 번호] - 날짜, 위에 새 [Unreleased] 추가
npm publish                    # or: pnpm publish
git push
```
