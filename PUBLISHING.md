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

Let the tooling bump the version, tag git, and keep them in sync:

```bash
npm version patch    # bumps package.json + creates a git tag v0.4.1
git push --follow-tags
npm publish
```

`npm version` refuses to run on a dirty tree, which is a feature — it forces
version bumps to be their own clean commit.

### Pre-releases

To publish a preview without it becoming the default `latest`:

```bash
npm version prerelease --preid beta   # 0.5.0-beta.0
npm publish --tag beta                 # installs only via `npm i dohwa@beta`
```

`latest` (what `npm i dohwa` grabs) stays on your last stable release.

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

Manual publishing is error-prone. A release workflow publishes on every git tag
using an npm **automation token** (Settings → Access Tokens → Granular →
Automation, which bypasses 2FA for CI):

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    tags: ['v*']
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
releasing is just:

```bash
npm version minor
git push --follow-tags     # the tag triggers the workflow; CI publishes
```

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
npm version patch|minor|major  # bump + tag
npm publish                    # or: pnpm publish
git push --follow-tags
```
