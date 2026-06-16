# SNI-Cowork — Self-Audit

**Date:** 2026-06-16
**Scope:** The SNI (Skill Network Integration) toolchain and its documentation, as ingested into this repository.
**Method:** Empirical. Every finding below was reproduced by running the code (`node --check`, executing each CLI against a fixture skill graph), not by reading alone. SNI is itself a tool for auditing skill networks, so this is SNI's own medicine applied to SNI.

---

## TL;DR

The shipped toolchain **did not run at all**. Both flagship scripts failed to *parse*, the third documented binary did not exist, and the package was not installable. The documentation described a mature, self-improving system; the code was a non-executing prototype.

This audit fixed every defect that was a clear correctness bug (so the tools now run, install, and are tested) and records the larger, design-dependent gaps as a prioritized roadmap rather than inventing behaviour silently.

| Status | Count |
|--------|-------|
| Critical defects (tool non-functional) — **fixed** | 4 |
| High-severity issues — **fixed** | 2 |
| Medium / design-dependent — **documented as roadmap** | 6 |

---

## What was ingested

| Area | Files |
|------|-------|
| Code | `bin/sni-init.js`, `bin/sni-cowork-bridge.js` |
| Docs | `docs/SNI-README.md`, `docs/SNI-DEPLOYMENT.md`, `docs/SNI-MANIFEST.txt` |
| Articles (context) | `docs/articles/maths-ai-forgot.md`, `docs/articles/frugal-maths-physics-ai.md` |
| Sample artifact | `examples/wordpress-event-plugin/` (from `So_cooking_.pdf`) |

The two Medium articles are thematic context, not part of the toolchain — they argue for *frugal, structurally-sound engineering over brute force*. That lens is applied directly in this audit: prefer making the existing design correct and honest over bolting on more surface area.

---

## Critical defects (fixed)

### C1 — `sni-init.js` does not parse (`SyntaxError`)
The flagship `npx sni-init` command crashed before doing anything.

```
$ node --check bin/sni-init.js
bin/sni-init.js:594
... .map(c => \`\${c[0]} → \${c[1]}\`) ...
                                      ^
SyntaxError: Invalid or unexpected token
```

**Cause:** escaped backticks (`` \` ``) used *inside* a `${ }` interpolation of a template literal (lines 592–596). Inside an interpolation you nest with plain backticks; escaping them produces an invalid token.
**Fix:** replaced the broken nested template with plain string concatenation in the interpolation.

### C2 — `sni-cowork-bridge.js` does not parse (`SyntaxError`)
Identical defect at line 190; `sni-cowork-bridge guide` crashed.
**Fix:** same correction.

### C3 — `sni-validator.js` does not exist
It is declared as a `bin` in `package.json`, has a full CLI section in the README (`contracts`, `cycles`, `orphans`, `audit`), and is referenced throughout the deployment guide — but the file was never present. Installing the package and running `sni-validator` would fail.
**Fix:** implemented `bin/sni-validator.js` to the documented spec, reusing the bootstrapper's discovery/parsing so there is **no duplicated graph logic**. It runs against an existing `manifest.json` or builds the graph in-memory from `SKILL.md` files, and returns a non-zero exit code on broken contracts or cycles (CI-friendly).

### C4 — Package is not installable
`package.json` had `"prepare": "npm run build"` → `"build": "tsc"` with **no TypeScript sources and no `tsconfig.json`**, so `npm install` would fail for any consumer. `main` pointed at `dist/index.js` and `files` shipped `dist/` and `lib/`, none of which exist.
**Fix:** removed the phantom TypeScript build, pointed `main` at `bin/sni-init.js`, corrected `files`, and wired `test` to Node's built-in runner (no external test dependency).

---

## High-severity issues (fixed)

### H1 — Broken `require` integration + global side effects
`sni-cowork-bridge.js`'s `initialize()` did `require('./sni-init.js')` expecting the `SNIBootstrapper` class, but `sni-init.js` exported nothing and had **no `require.main` guard** — requiring it would execute a full bootstrap against the current directory and call `process.exit()`. The method was also a self-admitted stub (`// For now, this is a stub`).
**Fix:** `sni-init.js` now `module.exports = SNIBootstrapper` and only auto-runs under `require.main === module`. `initialize()` now actually constructs the bootstrapper, runs it, and returns the loaded manifest.

### H2 — Skill discovery descends into `node_modules`/`.git`
`discoverSkills()` walked every directory with no ignore list and followed symlinks via `statSync`, so it would scan `node_modules`, `.git`, and `.sni` for `SKILL.md` (slow, and capable of picking up vendored fixtures) and could loop on symlinks.
**Fix:** added an ignore set (`node_modules`, `.git`, `.sni`, `.hg`, `.svn`) and switched to `lstatSync` so symlinks are not followed. Covered by a test.

---

## Verification

After the fixes, the full pipeline runs end-to-end on a fixture (`alpha → beta → gamma → alpha`, one orphan):

- `node --check` passes for all three binaries.
- `sni-init` discovers/parses, flags the unidirectional contract, detects the cycle, and writes `manifest.json` + `sni-setup.md`.
- `sni-validator audit` reports the contract break, the cycle, the orphan, and (honestly) that drift/usage metrics are uncomputed; exits non-zero.
- `sni-cowork-bridge guide` renders (previously a hard crash).
- `npm test` → **5 passing** (`test/sni.test.js`, Node built-in runner).

---

## Medium / design-dependent — recommended roadmap (not yet implemented)

These need product decisions, so they are recorded rather than guessed at.

### M1 — `drift_risk` and `loads_per_week` are never computed
The docs treat these as the heart of the "self-improving" loop, with thresholds and alerts — but no code ever sets them; they stay `0.0`. The validator now *reports* this gap honestly. **Decision needed:** define drift (e.g. time since `last_updated` vs. caller count) and a usage source (the `.sni/logs/` feedback is the only signal that exists today).

### M2 — Documented commands that don't exist
`sni-cowork-bridge fix-contracts` (deployment troubleshooting) is referenced but unimplemented. Either build it (auto-insert the missing `called_by` counter-entry) or remove the reference.

### M3 — `value_signal` ignores neutral feedback
Computed as `positive / (positive + negative)`, yet `feedback_neutral` is collected and stored. Decide whether neutral dilutes the signal or is excluded by design, and document it.

### M4 — Manifest schema drift
`hypotheses`, `rejected`, and `graduation_history` are declared but never populated or read; `version` is hard-coded `'2.0'` while docs imply other shapes. Either implement hypothesis graduation (a headline v2 feature in the docs) or trim the dead schema.

### M5 — Unbounded feedback logs
`rollupMetrics()` re-reads every file in `.sni/logs/` on every run with no compaction; over time this grows without limit. Add roll-up-then-archive.

### M6 — Skill ID collisions
`extractSkillId()` uses only the parent directory name, so two skills in different domains with the same folder name silently collide in the manifest. Add a uniqueness check (warn or namespace by domain).

---

## Bottom line

The gap here was not ambition — it was that the documentation had run ahead of code that didn't execute. The fixes in this pass close that gap for the *claimed v1 surface*: the three documented binaries now parse, run, install, and are tested. The roadmap items (M1–M6) are exactly the parts the docs describe as working but that aren't built yet — they are the honest definition of "v1.1".
