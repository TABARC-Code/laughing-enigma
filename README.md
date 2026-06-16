# laughing-enigma — SNI-Cowork

**Skill Network Integration (SNI) for Cowork** — auto-orchestrate collaborative Claude skill development. SNI scaffolds a `manifest.json` from a directory of `SKILL.md` files, validates the skill graph (bidirectional contracts, cycles, orphans), and wires feedback from Cowork tasks back into the manifest.

This repository ingested the SNI toolchain and put it through its own self-audit. **See [`SELF_AUDIT.md`](./SELF_AUDIT.md) for the full findings** — in short, the shipped tools did not run; this pass makes them parse, install, run, and pass tests.

## Layout

```
bin/
  sni-init.js            # scaffold manifest.json + .sni/ from a skills directory
  sni-cowork-bridge.js   # record feedback, roll up metrics, generate Cowork guide
  sni-validator.js       # validate contracts / cycles / orphans (CI-friendly)
test/
  sni.test.js            # smoke + behaviour tests (node --test)
docs/
  SNI-README.md          # original getting-started guide
  SNI-DEPLOYMENT.md      # distribution / deployment scenarios
  SNI-MANIFEST.txt       # package overview
  articles/              # context: "frugal / structural over brute force" essays
examples/
  wordpress-event-plugin/  # sample content artifact
SELF_AUDIT.md            # this repo's audit of the SNI toolchain
```

## Quick start

```bash
# Build a manifest + .sni/ scaffold from a skills directory
node bin/sni-init.js /path/to/skills

# Validate the graph (exits non-zero on broken contracts or cycles)
node bin/sni-validator.js audit /path/to/skills

# Generate the Cowork integration guide
node bin/sni-cowork-bridge.js guide /path/to/skills

# Run the tests
npm test
```

Requires Node ≥ 18 (tested on Node 22). No runtime dependencies.

## Status

`v1` surface (the three documented binaries) is functional and tested. The
self-improving metric loop (`drift_risk`, `loads_per_week`) and hypothesis
graduation described in the docs are **not yet implemented** — they are tracked
as M1–M6 in [`SELF_AUDIT.md`](./SELF_AUDIT.md).
