# SNI: Deployment & Distribution Guide

How to package, distribute, and deploy SNI (Skill Network Integration) for teams using Cowork.

---

## Architecture Overview

**SNI is a three-layer system:**

1. **Layer 1: Discovery & Scaffolding** (`sni-init`)
   - Scans skill directory for SKILL.md files
   - Extracts metadata and relationships
   - Generates manifest.json
   - Creates .sni/ internal state

2. **Layer 2: Validation & Monitoring** (validators)
   - Contract validation (bidirectional links)
   - Cycle detection
   - Orphan detection
   - Drift risk computation

3. **Layer 3: Cowork Integration** (`sni-cowork-bridge`)
   - Task templates (Build / Improve / Maintain)
   - Feedback logging
   - Metrics rollup
   - Signal generation

**For end users:** Just run `npx sni-init /path/to/skills`. Everything else is automatic.

---

## Distribution Channels

### Option 1: npm (Recommended for Scale)

Best for: Teams, open-source projects, organizations with npm infrastructure.

**Steps:**

1. Create GitHub repo: `github.com/TABARC-Code/sni-cowork`
   ```bash
   git init
   git remote add origin https://github.com/TABARC-Code/sni-cowork
   ```

2. Package for npm:
   ```bash
   npm init -y
   # Edit package.json with bin scripts, dependencies, etc.
   npm publish
   ```

3. Users install with:
   ```bash
   npm install -g sni-cowork
   sni-init /path/to/skills
   ```

### Option 2: Standalone Scripts (Lowest Friction)

Best for: Quick adoption, minimal setup, no npm required.

**Distribution:**

- Host `sni-init.js`, `sni-cowork-bridge.js`, `sni-validator.js` on GitHub or web server
- Users run:
  ```bash
  curl -O https://github.com/TABARC-Code/sni-cowork/raw/main/bin/sni-init.js
  chmod +x sni-init.js
  node sni-init.js /path/to/skills
  ```

### Option 3: Docker Container

Best for: Guaranteed consistency across teams.

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY bin/ bin/
COPY package.json .

RUN npm install

ENTRYPOINT ["node", "bin/sni-init.js"]
```

Usage:
```bash
docker run -v /path/to/skills:/skills sni-cowork /skills
```

---

## File Organization (for GitHub)

```
sni-cowork/
├── README.md                    # Main docs (what you see on GitHub)
├── LICENSE                      # MIT license
├── package.json                 # npm metadata
├── .gitignore
│
├── bin/
│   ├── sni-init.js             # Bootstrap tool (executable)
│   ├── sni-cowork-bridge.js     # Feedback & metrics (executable)
│   └── sni-validator.js         # Validation tools (executable)
│
├── lib/
│   ├── bootstrapper.js          # SNIBootstrapper class
│   ├── validator.js             # Contract & graph validation
│   ├── metrics.js               # Metrics rollup logic
│   └── templates.js             # Cowork task templates
│
├── docs/
│   ├── ARCHITECTURE.md          # System design (copy of UNIFIED_ARCHITECTURE_v2.md)
│   ├── INTEGRATION.md           # Skill-builder integration (copy of SKILL_BUILDER_INTEGRATION.md)
│   ├── DEPLOYMENT.md            # This file
│   └── EXAMPLES.md              # Real-world use cases
│
├── examples/
│   ├── worldbuilding-manifest.json   # Example manifest (worldbuilding system)
│   ├── code-architecture-manifest.json # Example (code design)
│   └── content-framework-manifest.json # Example (marketing/content)
│
└── test/
    ├── sni-init.test.js
    ├── validator.test.js
    └── metrics.test.js
```

---

## Deployment Scenarios

### Scenario 1: Individual Developer + Cowork

**Goal:** Single person using SNI to manage their own skill system.

**Setup (5 min):**
1. `npm install -g sni-cowork`
2. `sni-init ~/my-skills`
3. Read `sni-setup.md`
4. Create Cowork workspace, upload manifest + tasks
5. Start building/improving skills

**Ongoing:**
- Do Cowork tasks weekly
- Run `sni-cowork-bridge rollup` to update metrics
- Review drift signals monthly

### Scenario 2: Team Collaboration (3–5 people)

**Goal:** Multiple people improving the same skill system together.

**Setup (30 min):**
1. One person runs `sni-init`
2. Commit manifest.json + .sni/ to git
3. Shared Cowork workspace: manifest.json + task templates
4. Each person gets a different task:
   - Person A: Build new skill
   - Person B: Improve existing skill
   - Person C: Maintenance

**Workflow:**
- Each task completion records feedback
- Weekly maintenance aggregates metrics
- Monthly review surfaces improvement signals
- Team Kaizen pass on high-risk skills

**Sync:** Git + Cowork (manifest in both places, keep in sync)

### Scenario 3: Enterprise Deployment (20+ skills, 10+ people)

**Goal:** Large organization with multiple skill systems across teams.

**Setup (2 hours):**

1. **Central SNI service** (optional):
   ```bash
   # Docker container or Lambda function
   # Accepts: POST /initialize with skill directory
   # Returns: manifest.json + task templates
   ```

2. **Per-team Cowork workspaces:**
   - Design system team: own manifest, 8 skills
   - Code architecture team: own manifest, 12 skills
   - Content framework team: own manifest, 6 skills

3. **Shared GitHub org:**
   - Mirrors each manifest
   - CI/CD validates contracts on every push
   - Weekly automated rollup of metrics

**Sync Model:**
```
Cowork Task
    ↓ (feedback recorded)
Session Log
    ↓ (weekly)
GitHub Manifest Update (automated)
    ↓ (CI validates)
Metrics Dashboard (read-only view)
```

---

## Implementation Checklist

### Before Release

- [ ] All three CLI tools (init, bridge, validator) are executable
- [ ] README.md is complete and clear
- [ ] package.json has correct bin entries
- [ ] LICENSE file present (MIT recommended)
- [ ] ARCHITECTURE.md and INTEGRATION.md in /docs
- [ ] Example manifests for 2–3 domains
- [ ] Unit tests for critical functions (bootstrapper, validator)
- [ ] GitHub repo created and public

### Version 1.0 Release

- [ ] Publish to npm: `npm publish`
- [ ] Tag release: `git tag v1.0.0 && git push --tags`
- [ ] Create GitHub Release with:
  - What's new (manifest validation, Cowork integration, etc.)
  - Installation instructions
  - Quick start guide
  - Known issues/limitations
- [ ] Post announcement (Twitter, Reddit /r/worldbuilding, etc.)

### Post-Release

- [ ] Monitor GitHub issues
- [ ] Publish week 1 follow-up guide (best practices)
- [ ] Share real-world use case (worldbuilding example)
- [ ] Plan v2.0 (manifest import, custom validators, hypothesis graduation)

---

## Quick Reference: Command Distribution

**npm (global install):**
```bash
npm install -g sni-cowork

sni-init /path/to/skills
sni-cowork-bridge guide /path/to/skills
sni-validator audit /path/to/skills
```

**Standalone (git clone):**
```bash
git clone https://github.com/TABARC-Code/sni-cowork
cd sni-cowork

node bin/sni-init.js /path/to/skills
node bin/sni-cowork-bridge.js guide /path/to/skills
node bin/sni-validator.js audit /path/to/skills
```

**Docker:**
```bash
docker run sni-cowork /path/to/skills
docker run sni-cowork sni-cowork-bridge guide /path/to/skills
```

---

## Metrics: Success Indicators

After launching SNI, track:

1. **Adoption:**
   - npm downloads per week
   - GitHub stars / forks
   - Teams using SNI (via issues / discussions)

2. **Quality:**
   - Average manifest size (# skills)
   - % of skills with bidirectional contracts
   - % of teams running maintenance weekly
   - Average value_signal across manifests (target: ≥ 0.75)

3. **Impact:**
   - Time saved per team (self-reported)
   - Reduction in cascade violations
   - Improvement cycle frequency

---

## Troubleshooting Deployment Issues

**Issue: `sni-init` doesn't find any skills**

→ Check that SKILL.md files exist and directory is correct
→ Verify filename is exactly `SKILL.md` (case-sensitive on Linux)

**Issue: Contract validation fails (unidirectional links)**

→ Edit manifest.json manually or run `sni-cowork-bridge fix-contracts`
→ Add counter-calls to called_by arrays if contracts are correct

**Issue: Feedback logging doesn't work in Cowork**

→ Ensure session logs directory exists (.sni/logs/)
→ Check permissions: directory must be writable
→ Verify Cowork is running the task script (not chat)

**Issue: Metrics don't update after task completion**

→ Run `sni-cowork-bridge rollup` manually
→ Check session log files were created in .sni/logs/
→ Ensure manifest.json is not read-only

---

## Next Steps

1. **Publish v1.0 to npm** (see checklist above)
2. **Document for users** (SNI-README.md is ready)
3. **Gather feedback** (issues + discussions)
4. **Build v2.0 features:**
   - Manifest merge (for existing systems)
   - Custom validators (domain-specific rules)
   - Hypothesis graduation (auto-promote rules)
   - Drift explanations (why is skill risky?)

---

## Contact & Support

- GitHub: github.com/TABARC-Code/sni-cowork
- Issues: github.com/TABARC-Code/sni-cowork/issues
- Discussions: github.com/TABARC-Code/sni-cowork/discussions

---

## License

MIT. Feel free to fork, modify, distribute.
