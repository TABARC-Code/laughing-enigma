# SNI: Skill Network Integration for Cowork

Automate collaborative Claude skill development with Cowork. Works with any Claude skill system—worldbuilding, code architecture, content frameworks, design systems, anything.

**What it does:**
- Auto-scaffolds `manifest.json` from your skill directory
- Creates Cowork task templates (Build / Improve / Maintenance)
- Validates skill contracts bidirectionally
- Detects cycles, orphans, drift, stale content
- Tracks feedback metrics automatically
- Surfaces improvement signals for next Kaizen pass

**What you get:**
- A living skill graph (who calls who, what's healthy)
- Async collaboration without losing consistency
- Automated skill improvement based on actual use
- Zero manual manifest management

---

## Install

```bash
npm install sni-cowork
# or
yarn add sni-cowork
# or copy the scripts to your project
```

## Quick Start (5 minutes)

### 1. Initialize Your Skills

```bash
npx sni-init /path/to/your/skills
```

Output:
```
✓ Found 15 skills
✓ Parsed skill metadata
✓ All contracts bidirectional
✓ No cycles detected
✓ manifest.json written
✓ Created .sni/ with validators
✓ Generated Cowork task templates
✓ Setup guide ready

📍 Next steps:
   1. Review sni-setup.md
   2. Create Cowork workspace
   3. Import manifest.json and .sni/cowork-tasks/*.md
   4. Start a task
```

### 2. Set Up Cowork Workspace

1. Create workspace in Cowork
2. Upload to shared Documents:
   - Your entire skills directory
   - `manifest.json` (root)
   - `.sni/cowork-tasks/` (task templates)

3. Create three tasks from templates:
   - "Build New Skill" (from task-build-skill.md)
   - "Improve Skill" (from task-improve-skill.md)
   - "Maintenance" (from task-maintenance.md)

### 3. Start Using

**Building a new skill:**
```
1. Open "Build New Skill" task
2. Load manifest.json (shows current state)
3. Follow Phases 1–4
4. On completion: provide feedback (positive/neutral/negative)
5. System auto-updates manifest
```

**Improving a skill:**
```
1. Open "Improve Skill" task
2. Load manifest.json (shows drift signals + which skills need help)
3. Work on highest-risk skill
4. Run contract validator before finishing
5. Provide feedback
```

**Weekly maintenance:**
```
1. Run "Maintenance" task
2. System rolls up all feedback logs into metrics
3. Identifies orphans, drift, cycles, graduation candidates
4. Outputs: "Next 3 skills to Kaizen: [list]"
```

---

## How It Works

### The Loop

```
TASK COMPLETION
    ↓
Feedback recorded (positive/neutral/negative)
    ↓
Session log written
    ↓
Weekly maintenance accumulates logs
    ↓
Manifest metrics updated
    ↓
Drift signals computed
    ↓
Next Kaizen pass prioritized
    ↓
REPEAT
```

### The Manifest (`manifest.json`)

Ground truth for your skill system. Contains:

```json
{
  "skills": [
    {
      "id": "skill-name",
      "name": "Human-Readable Name",
      "file": "path/to/SKILL.md",
      "calls": [
        {
          "target_id": "other-skill",
          "criticality": "CRITICAL|HIGH|MEDIUM|LOW",
          "feedback_positive": 8,
          "feedback_negative": 2
        }
      ],
      "called_by": [...],
      "metrics": {
        "loads_per_week": 2.3,
        "value_signal": 0.8,       // usefulness (0–1)
        "drift_risk": 0.15,        // staleness (0–1)
        "orphan_risk": 0.0         // disuse (0 or 1)
      }
    }
  ],
  "hypotheses": [...],           // Ideas under testing
  "rejected": [...],             // Immune memory
  "integrity_checks": {
    "cycles_detected": [],
    "orphans": [],
    "contradictions": []
  }
}
```

### Metrics Explained

| Metric | Meaning | Target | Alert |
|--------|---------|--------|-------|
| `loads_per_week` | Usage frequency | > 0.5 | None |
| `value_signal` | Usefulness ratio | ≥ 0.75 | < 0.6 |
| `drift_risk` | Staleness likelihood | ≤ 0.2 | > 0.4 |
| `orphan_risk` | Not used in 60+ days | 0.0 | = 1.0 |

---

## CLI Commands

### `sni-init`

Initialize SNI for a skill directory.

```bash
npx sni-init /path/to/skills
npx sni-init .                    # current directory
npx sni-init ~/my-skills          # home directory
```

Creates:
- `manifest.json` (master file)
- `.sni/` directory (tools, validators, logs)
- `.sni/cowork-tasks/` (task templates)
- `sni-setup.md` (integration guide)

### `sni-cowork-bridge`

Manage SNI state and feedback.

```bash
# Generate Cowork integration guide
npx sni-cowork-bridge guide /path/to/skills

# Record feedback from a task
npx sni-cowork-bridge feedback /path/to/skills skill-id positive "Useful in auth refactor"
npx sni-cowork-bridge feedback /path/to/skills skill-id negative "Docs outdated"

# Roll up logs into metrics (run weekly)
npx sni-cowork-bridge rollup /path/to/skills
```

### `sni-validator`

Validate skill contracts and graph health.

```bash
# Check all bidirectional contracts
npx sni-validator contracts /path/to/skills

# Detect cycles in skill graph
npx sni-validator cycles /path/to/skills

# Find orphans (unused skills)
npx sni-validator orphans /path/to/skills

# Full system audit
npx sni-validator audit /path/to/skills
```

---

## Directory Structure (After Init)

```
your-skills/
├── manifest.json                 # Ground truth (load this first in every task)
├── sni-setup.md                  # Integration guide (human-readable)
│
├── skill-name-1/
│   ├── SKILL.md                  # Skill definition with Relationships section
│   └── references/               # Reference files
│
├── skill-name-2/
│   └── ...
│
└── .sni/                          # SNI internal state (don't edit manually)
    ├── validators/
    │   └── domain-validator.js    # Custom validation rules
    ├── cowork-tasks/
    │   ├── task-build-skill.md    # Template: Building a new skill
    │   ├── task-improve-skill.md  # Template: Kaizen pass
    │   └── task-maintenance.md    # Template: Weekly maintenance
    ├── logs/
    │   └── feedback-*.json        # Accumulated feedback (auto-generated)
    └── state/
        └── last-*.json            # Session state
```

---

## Writing Skills for SNI

Every SKILL.md should have a `## Relationships` section:

```markdown
## Relationships

### Feeds into

- **other-skill-id** (CRITICAL): [what this skill provides]
- **another-skill** (HIGH): [dependency description]

### Fed by

- **upstream-skill** (MEDIUM): [what this skill receives]
- **dependency** (LOW): [optional enrichment]

### Feedback loops

- **Positive signal:** [What means this skill is doing its job]
- **Negative signal:** [What user action triggers a Kaizen pass]
- **Manifest signal:** drift_risk > 0.4 or value_signal < 0.6
```

Example (worldbuilding):

```markdown
## Relationships

### Feeds into

- **worldbuilding-02-technology** (CRITICAL): Orientation and Age constrain Technology Value
- **worldbuilding-03-subsistence** (CRITICAL): Tech Value gates Subsistence Classification
- **worldbuilding-11-language** (HIGH): Interaction value determines lingua franca necessity

### Fed by

(None—Foundations is the root)

### Feedback loops

- **Positive signal:** User builds a world that passes cascade validation without contradictions
- **Negative signal:** Cascade violation alerts are triggered; Orientation/Age don't match expected archetypes
- **Manifest signal:** drift_risk > 0.4 if Foundations parameters are stale
```

---

## Real-World Example: Worldbuilding

Your worldbuilding system has 15 skills. You set up SNI:

```bash
npx sni-init ~/projects/worldbuilding
# ✓ Found 15 skills
# ✓ All contracts bidirectional
# ✓ manifest.json written
```

Your team creates a Cowork workspace. Three people collaborate:

**Day 1 — Person A builds a society:**
- Opens "Build New Skill" task (actually, they open "Build: Mad Prophet Theocracy")
- Loads manifest.json (shows 15 healthy skills, no cycles)
- Works through Phases 1–10 using worldbuilding skills
- On completion: "This was a coherent world. The cascade caught a contradiction I made. Positive."
- System: Feedback recorded for worldbuilding-05-economics skill

**Day 2 — Person B enriches with language & magic:**
- Opens "Improve Skill" task with focus on Skills 11–13
- Loads manifest.json (shows worldbuilding-01-foundations locked from Day 1)
- Adds language, magic system, species
- On completion: "Naming logic wasn't clear. I clarified it. Neutral."
- System: Feedback recorded for worldbuilding-11-language

**Day 7 — Weekly maintenance:**
- Run "Maintenance" task
- System rolls up 5 task feedbacks into metrics
- worldbuilding-05-economics shows value_signal = 0.8 (positive feedback)
- worldbuilding-14-narrative-texture shows drift_risk = 0.35 (hasn't been used, needs review)
- Output: "Next Kaizen candidates: [worldbuilding-14, worldbuilding-13 (lower confidence)]"

**Day 14 — Kaizen pass:**
- Person C picks up "Improve Skill" task
- Loads drift signals from maintenance
- Works on worldbuilding-14-narrative-texture based on feedback
- Updates description, examples, feedback loops
- On completion: "Rewrote narrative texture integration. Should clarify structure. Positive."
- Manifest updated; drift_risk drops to 0.1

---

## Frequently Asked Questions

**Q: Does this work with Cowork?**

Yes. The manifest is a shared document in Cowork. Tasks load it. Feedback updates it. Everyone stays in sync without manual coordination.

**Q: Can I use this with non-worldbuilding skills?**

Yes. SNI works with any Claude skill system. Code architecture, design systems, content frameworks, legal templates—anything with skills that call other skills.

**Q: What if I'm the only user?**

SNI still works. It becomes a personal skill improvement system. Feedback and metrics guide your next Kaizen pass.

**Q: How often do metrics update?**

Every time you complete a task. Feedback is recorded immediately. Weekly maintenance rolls up into aggregate metrics.

**Q: Can I import an existing manifest?**

Not yet in v1. You'd need to manually create it. v2 will include manifest import/merge tools.

**Q: What if I add a new skill?**

Run `sni-init` again. It discovers new skills and updates manifest.json. Existing entries stay unchanged.

---

## Roadmap

**v1.0 (current):**
- Auto-scaffold manifest from skill directory ✓
- Cowork task templates ✓
- Feedback logging ✓
- Metrics rollup ✓
- Contract validation ✓

**v2.0 (planned):**
- Manifest import/merge (for existing systems)
- Custom validation rules per domain
- Hypothesis graduation automation
- Drift signal explanations (why is this skill risky?)
- Skill recommendation engine (suggest next Kaizen target)

**v3.0 (future):**
- GitHub integration (auto-sync manifest on push)
- Slack notifications (weekly digest of metrics)
- Web dashboard (visual skill graph + metrics)
- Claude API integration (auto-test skills on changes)

---

## Support

- **Documentation:** See `sni-setup.md` in your initialized directory
- **Architecture:** Read `UNIFIED_ARCHITECTURE_v2.md` (in SNI source)
- **Integration:** See `SKILL_BUILDER_INTEGRATION.md` for skill-builder workflow
- **Issues:** GitHub issues (link to repo)

---

## License

MIT

## Author

Built on SNI (Skill Network Integration) by [your-org]. Worldbuilding system by TABARC-Code.

---

## TL;DR

```bash
# 1. Initialize your skills
npx sni-init /path/to/skills

# 2. Read the setup guide
cat /path/to/skills/sni-setup.md

# 3. Create Cowork workspace
# → Upload manifest.json + .sni/cowork-tasks/

# 4. Use tasks to collaborate
# → Build New Skill / Improve Skill / Maintenance

# 5. System improves itself
# → Feedback → Metrics → Signals → Next Kaizen
```

Done. Your skills are now collaborative, validated, and self-improving.
