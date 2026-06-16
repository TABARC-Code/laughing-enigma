# laughing-enigma — SNI-Cowork

**Skill Network Integration (SNI) for Cowork** — auto-orchestrate collaborative Claude skill development. SNI scaffolds a `manifest.json` from a directory of `SKILL.md` files, validates the skill graph (bidirectional contracts, cycles, orphans), and wires feedback from Cowork tasks back into the manifest.

This repository ingested the SNI toolchain and put it through its own self-audit. **See [`SELF_AUDIT.md`](./SELF_AUDIT.md) for the full findings** — in short, the shipped tools did not run; this pass makes them parse, install, run, and pass tests.

## Layout

```
bin/
  sni-init.js            # scaffold manifest.json + .sni/ from a skills directory
  sni-cowork-bridge.js   # record feedback, roll up metrics, generate Cowork guide
  sni-validator.js       # validate contracts / cycles / orphans (CI-friendly)
  sni-kaizen.js          # run a Kaizen pass on a drifting skill and persist it
lib/
  metrics.js             # drift_risk / loads_per_week (shared by init + bridge)
  kaizen.js              # Kaizen retrospective logic (seven wastes, five questions)
skills/
  kaizen/SKILL.md        # the Kaizen pass as a first-class, manifest-trackable skill
test/
  *.test.js              # smoke + behaviour + metrics + kaizen tests (node --test)
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

# Close the loop: run a Kaizen pass on the most-drifted skill
node bin/sni-kaizen.js list /path/to/skills
node bin/sni-kaizen.js retro /path/to/skills            # writes a retro scaffold
node bin/sni-kaizen.js complete /path/to/skills <skill> --note "standard to formalise"

# Run the tests
npm test
```

## The improvement loop

SNI computes `drift_risk` to surface *what* needs attention; **Kaizen** is the
discipline that captures the improvement so it persists. Grounded in *"The
Standard Is Never Finished"*: because AI is stateless between sessions, the
improvement has to live in a written system, not the tool. `sni-kaizen`
therefore turns a drift signal into a written retrospective (seven wastes, five
questions), a `CONSTITUTION.md` entry, and a manifest `kaizen_history` record —
then clears the drift. The standard is never finished; this is the mechanism
for improving it.

Requires Node ≥ 18 (tested on Node 22). No runtime dependencies.

## Status

`v1` surface (the three documented binaries) is functional and tested, and the
self-improving metric loop (`drift_risk`, `loads_per_week`) is now implemented
in `lib/metrics.js` — drift starts as deterministic staleness and evolves as
usage feedback accumulates. Remaining roadmap items (hypothesis graduation,
`fix-contracts`, neutral-feedback handling, log compaction, ID-collision
checks) are tracked as M2–M6 in [`SELF_AUDIT.md`](./SELF_AUDIT.md).
