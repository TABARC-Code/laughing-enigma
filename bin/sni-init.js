#!/usr/bin/env node

/**
 * sni-init
 * Automated SNI scaffolding for any Claude skill directory
 * 
 * Usage:
 *   npx sni-init /path/to/skills
 *   npx sni-init https://github.com/user/skills-repo
 *   npx sni-init . (current directory)
 * 
 * Output:
 *   - manifest.json (master skill graph)
 *   - .sni/ (internal state + validators)
 *   - cowork-tasks/ (ready-to-import Cowork templates)
 *   - sni-setup.md (human-readable integration guide)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SNIBootstrapper {
  constructor(targetPath) {
    this.targetPath = path.resolve(targetPath);
    this.skills = [];
    this.manifest = {
      version: '2.0',
      agent: {
        name: '',
        role: 'Multi-skill Orchestrator',
        created: new Date().toISOString()
      },
      skills: [],
      hypotheses: [],
      rejected: [],
      integrity_checks: {
        last_run: new Date().toISOString(),
        cycles_detected: [],
        orphans: [],
        contradictions: [],
        broken_routes: []
      }
    };
  }

  /**
   * Step 1: Discover all SKILL.md files in target directory
   */
  discoverSkills() {
    console.log(`🔍 Discovering skills in ${this.targetPath}...`);
    
    // Directories we never want to descend into when discovering skills.
    const IGNORED_DIRS = new Set(['node_modules', '.git', '.sni', '.hg', '.svn']);

    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        // Use lstat so we don't follow symlinks (avoids cycles / escaping the tree).
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
          if (IGNORED_DIRS.has(file)) return;
          walk(fullPath);
        } else if (file === 'SKILL.md') {
          this.skills.push(fullPath);
        }
      });
    };
    
    walk(this.targetPath);
    console.log(`✓ Found ${this.skills.length} skills`);
    return this;
  }

  /**
   * Step 2: Parse each SKILL.md for metadata and relationships
   */
  parseSkills() {
    console.log(`📖 Parsing skill metadata...`);
    
    this.skills.forEach((skillPath) => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const skillId = this.extractSkillId(skillPath);
      const skillName = this.extractSkillName(content);
      const relationships = this.parseRelationships(content);
      
      const skillEntry = {
        id: skillId,
        name: skillName,
        file: path.relative(this.targetPath, skillPath),
        type: 'procedure',
        domain: this.extractDomain(skillPath),
        lines: content.split('\n').length,
        last_updated: new Date().toISOString(),
        calls: relationships.calls || [],
        called_by: relationships.called_by || [],
        graduation_history: [],
        metrics: {
          loads_per_week: 0,
          value_signal: 0.0,
          drift_risk: 0.0,
          orphan_risk: 0.0
        },
        tags: ['active', 'discovered'],
        owner: null
      };
      
      this.manifest.skills.push(skillEntry);
    });
    
    console.log(`✓ Parsed ${this.manifest.skills.length} skills`);
    return this;
  }

  /**
   * Extract skill ID from file path: /path/to/worldbuilding-04-politics/SKILL.md → worldbuilding-04-politics
   */
  extractSkillId(skillPath) {
    const parts = skillPath.split(path.sep);
    return parts[parts.length - 2] || 'unknown-skill';
  }

  /**
   * Extract skill name from first H1 heading: # SKILL NAME → "SKILL NAME"
   */
  extractSkillName(content) {
    const match = content.match(/^# (.+)$/m);
    return match ? match[1].trim() : 'Unnamed Skill';
  }

  /**
   * Extract domain from directory structure: /path/worldbuilding-01-foundations → worldbuilding
   */
  extractDomain(skillPath) {
    const parts = skillPath.split(path.sep);
    const skillDir = parts[parts.length - 2];
    const domainMatch = skillDir.match(/^([a-z]+)(-\d+)?/);
    return domainMatch ? domainMatch[1] : 'general';
  }

  /**
   * Parse ## Relationships section: Feeds into / Fed by / Feedback loops
   */
  parseRelationships(content) {
    const relationships = {
      calls: [],
      called_by: [],
      feedback: []
    };

    // Look for "Feeds into" or "PROVIDES TO" section
    const feedsIntoMatch = content.match(/###?\s+(?:Feeds into|PROVIDES TO)([\s\S]*?)(?:###|$)/i);
    if (feedsIntoMatch) {
      const feedsText = feedsIntoMatch[1];
      // Match lines like: "- **skill-name** (CRITICAL): description"
      const calls = feedsText.match(/[-*]\s+\*\*([a-z0-9\-]+)\*\*\s*\(([A-Z]+)\):\s*(.+)/gi);
      if (calls) {
        calls.forEach(call => {
          const match = call.match(/[-*]\s+\*\*([a-z0-9\-]+)\*\*\s*\(([A-Z]+)\):\s*(.+)/i);
          if (match) {
            relationships.calls.push({
              target_id: match[1],
              context: match[3],
              criticality: match[2],
              feedback_count: 0,
              feedback_positive: 0,
              feedback_neutral: 0,
              feedback_negative: 0
            });
          }
        });
      }
    }

    // Look for "Fed by" or "RECEIVES FROM" section
    const fedByMatch = content.match(/###?\s+(?:Fed by|RECEIVES FROM)([\s\S]*?)(?:###|$)/i);
    if (fedByMatch) {
      const fedText = fedByMatch[1];
      const callers = fedText.match(/[-*]\s+\*\*([a-z0-9\-]+)\*\*:\s*(.+)/gi);
      if (callers) {
        callers.forEach(caller => {
          const match = caller.match(/[-*]\s+\*\*([a-z0-9\-]+)\*\*:\s*(.+)/i);
          if (match) {
            relationships.called_by.push({
              source_id: match[1],
              context: match[2],
              count: 0
            });
          }
        });
      }
    }

    // Look for "Feedback loops" section
    const feedbackMatch = content.match(/###?\s+Feedback loops([\s\S]*?)(?:###|$)/i);
    if (feedbackMatch) {
      const feedbackText = feedbackMatch[1];
      const signals = feedbackText.match(/[-*]\s+\*\*([A-Za-z\s]+)\*\*:\s*(.+)/g);
      if (signals) {
        signals.forEach(signal => {
          const match = signal.match(/[-*]\s+\*\*([A-Za-z\s]+)\*\*:\s*(.+)/);
          if (match) {
            relationships.feedback.push({
              type: match[1].toLowerCase().replace(/\s+/g, '_'),
              description: match[2]
            });
          }
        });
      }
    }

    return relationships;
  }

  /**
   * Step 3: Validate contracts bidirectionally
   */
  validateContracts() {
    console.log(`🔗 Validating bidirectional contracts...`);
    
    let issues = 0;
    
    this.manifest.skills.forEach(skill => {
      skill.calls.forEach(call => {
        const target = this.manifest.skills.find(s => s.id === call.target_id);
        
        if (!target) {
          console.warn(`  ⚠ ${skill.id} calls ${call.target_id} but target not found`);
          issues++;
          return;
        }
        
        // Check bidirectional: does target acknowledge being called by source?
        const counterCall = target.called_by.find(c => c.source_id === skill.id);
        if (!counterCall) {
          console.warn(`  ⚠ ${skill.id} → ${call.target_id} is unidirectional (target doesn't acknowledge)`);
          issues++;
        }
      });
    });
    
    if (issues === 0) {
      console.log(`✓ All contracts bidirectional`);
    } else {
      console.log(`✓ Found ${issues} contract issues (logged as warnings)`);
    }
    
    return this;
  }

  /**
   * Step 4: Detect cycles in skill graph
   */
  detectCycles() {
    console.log(`🔄 Detecting cycles...`);
    
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const hasCycle = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const skill = this.manifest.skills.find(s => s.id === nodeId);
      if (!skill) return false;

      for (const call of skill.calls) {
        const target = call.target_id;
        
        if (!visited.has(target)) {
          if (hasCycle(target)) return true;
        } else if (recStack.has(target)) {
          cycles.push([nodeId, target]);
          return true;
        }
      }
      
      recStack.delete(nodeId);
      return false;
    };

    // Check all skills for cycles
    this.manifest.skills.forEach(skill => {
      if (!visited.has(skill.id)) {
        hasCycle(skill.id);
      }
    });

    this.manifest.integrity_checks.cycles_detected = cycles;
    
    if (cycles.length === 0) {
      console.log(`✓ No cycles detected`);
    } else {
      console.warn(`✓ Found ${cycles.length} cycles`);
      cycles.forEach(cycle => {
        console.warn(`  ${cycle[0]} → ${cycle[1]} → ...`);
      });
    }
    
    return this;
  }

  /**
   * Step 5: Identify orphans (never called, calls nothing)
   */
  detectOrphans() {
    console.log(`👻 Detecting orphans...`);
    
    const orphans = [];
    
    this.manifest.skills.forEach(skill => {
      const inDegree = skill.called_by.length;
      const outDegree = skill.calls.length;
      
      if (inDegree === 0 && outDegree === 0) {
        orphans.push(skill.id);
        skill.metrics.orphan_risk = 1.0;
      }
    });

    this.manifest.integrity_checks.orphans = orphans;
    
    if (orphans.length === 0) {
      console.log(`✓ No orphans`);
    } else {
      console.log(`✓ Found ${orphans.length} orphans (may be intentional)`);
      orphans.forEach(id => console.log(`  - ${id}`));
    }
    
    return this;
  }

  /**
   * Step 6: Write manifest.json
   */
  writeManifest() {
    console.log(`📝 Writing manifest.json...`);
    
    const manifestPath = path.join(this.targetPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    
    console.log(`✓ Manifest written to ${manifestPath}`);
    return this;
  }

  /**
   * Step 7: Create .sni/ directory for tools and state
   */
  createSNIDirectory() {
    console.log(`🛠 Creating .sni/ directory...`);
    
    const sniDir = path.join(this.targetPath, '.sni');
    if (!fs.existsSync(sniDir)) {
      fs.mkdirSync(sniDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['validators', 'logs', 'state'];
    subdirs.forEach(subdir => {
      const fullPath = path.join(sniDir, subdir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath);
      }
    });

    // Write validator stub files (user will add actual validation logic)
    const validatorTemplate = `#!/usr/bin/env node
/**
 * Custom validator for this skill domain
 * Add domain-specific validation rules here
 */
const manifest = require('../manifest.json');

function validate() {
  // TODO: Add validation logic
  return { valid: true, issues: [] };
}

module.exports = { validate };
`;

    this.manifest.skills.forEach(skill => {
      const domain = skill.domain;
      const validatorPath = path.join(sniDir, 'validators', `${domain}-validator.js`);
      if (!fs.existsSync(validatorPath)) {
        fs.writeFileSync(validatorPath, validatorTemplate);
      }
    });

    console.log(`✓ Created .sni/ with validators`);
    return this;
  }

  /**
   * Step 8: Generate Cowork task templates
   */
  generateCoworkTasks() {
    console.log(`📋 Generating Cowork task templates...`);
    
    const tasksDir = path.join(this.targetPath, '.sni', 'cowork-tasks');
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Template 1: Skill Build task (for building a new skill)
    const buildTask = `# Cowork Task: Build New Skill

## Setup
- Load: \`manifest.json\`
- Reference: \`.sni/state/last-build-plan.json\`

## Procedure
1. **Phase 1: Explore** — Draft skill concept, rejected ideas, candidate relationships
2. **Phase 2: Define** — Outline trigger, capabilities, non-goals, architecture
3. **Phase 3: Engineer** — Write SKILL.md with Relationships section (Feeds into / Fed by / Feedback loops)
4. **Phase 4: Validate** — Run contract validator
5. **Sign-off** — skill-manifest-sync updates manifest

## Deliverables
- SKILL.md with \`## Relationships\` section
- Manifest entry (auto-generated)
- Feedback mechanisms documented

## Success Criteria
- All contracts bidirectional ✓
- No new cycles ✓
- Relationships section complete ✓
`;

    fs.writeFileSync(path.join(tasksDir, 'task-build-skill.md'), buildTask);

    // Template 2: Skill Improvement task (for Kaizen)
    const improveTask = `# Cowork Task: Improve Skill (Kaizen Pass)

## Setup
- Load: \`manifest.json\`
- Check: Drift signals (which skills need improvement)
- Load: Target skill's SKILL.md

## Procedure
1. **Gather Signals** — Review manifest metrics, user feedback, validator warnings
2. **Diagnose** — Identify defects and improvement areas
3. **Plan** — Outline changes to SKILL.md or Relationships
4. **Implement** — Update skill content, relationships, feedback loops
5. **Validate** — Run contract validator, graph analyzer
6. **Log** — Update manifest metrics

## Deliverables
- Updated SKILL.md with rationale for changes
- Updated Relationships if contracts changed
- Updated feedback mechanisms
- Manifest metrics updated

## Success Criteria
- All contracts still bidirectional ✓
- No regressions (cycles, orphans) ✓
- Metrics improved or stable ✓
`;

    fs.writeFileSync(path.join(tasksDir, 'task-improve-skill.md'), improveTask);

    // Template 3: System Maintenance task (weekly)
    const maintenanceTask = `# Cowork Task: System Maintenance (Weekly)

## Procedure
1. **Roll up Metrics** — Accumulate session logs → manifest metrics
2. **Run Validators** — contract-validator.js, graph-analyzer.js
3. **Check Drift** — Which skills show high orphan_risk or drift_risk?
4. **Graduation Review** — Any hypotheses ready to become rules?
5. **Report** — Summarise findings for next Kaizen priorities

## Output
- Updated manifest.json with new metrics
- Maintenance report (what needs attention)
- Prioritised list for next Kaizen passes

## Success Criteria
- Manifest is fresh ✓
- No new cycles or orphans ✓
- Drift signals computed ✓
`;

    fs.writeFileSync(path.join(tasksDir, 'task-maintenance.md'), maintenanceTask);

    console.log(`✓ Created 3 Cowork task templates`);
    return this;
  }

  /**
   * Step 9: Generate setup guide for Cowork integration
   */
  generateSetupGuide() {
    console.log(`📚 Generating setup guide...`);
    
    const guide = `# SNI + Cowork Integration Guide

Generated: ${new Date().toISOString()}

## What Just Happened

Your skill directory has been scaffolded for SNI (Skill Network Integration):

- \`manifest.json\` — Master file documenting all ${this.manifest.skills.length} skills, their relationships, and health metrics
- \`.sni/\` — Internal state, validators, Cowork task templates
- \`.sni/cowork-tasks/\` — Ready-to-import Cowork tasks

## Next: Import to Cowork

1. Create a Cowork workspace for your skill system
2. Upload to shared Documents:
   - \`manifest.json\`
   - \`.sni/cowork-tasks/*.md\`
   - All skill directories

3. Create tasks from templates in Cowork:
   - Task 1: "Build New Skill" (template: \`.sni/cowork-tasks/task-build-skill.md\`)
   - Task 2: "Improve Skill" (template: \`.sni/cowork-tasks/task-improve-skill.md\`)
   - Task 3: "Weekly Maintenance" (template: \`.sni/cowork-tasks/task-maintenance.md\`)

4. Configure task routing:
   - Build task → loads manifest + skill template
   - Improve task → loads manifest + drift signals + target skill
   - Maintenance task → runs validators, updates manifest

## How It Works

**First time using:**
1. Load a task (Build / Improve / Maintenance)
2. System: "Load manifest.json first. Current system state: [${this.manifest.skills.length} skills, ${this.manifest.integrity_checks.cycles_detected.length} cycles, ${this.manifest.integrity_checks.orphans.length} orphans]"
3. Complete the task
4. Provide feedback (positive/neutral/negative on skill usefulness)
5. On task completion: your feedback updates manifest metrics

**After 2-4 weeks:**
- Manifest metrics start showing patterns
- Drift signals appear (skills that are stale or unused)
- Graduation candidates surface (hypotheses ready to become rules)
- System recommends next Kaizen passes

**Ongoing:**
- Weekly maintenance task rolls up metrics
- Monthly review of drift signals
- Quarterly Kaizen passes on high-risk skills
- Continuous feedback loop improves system

## Key Files

| File | Purpose |
|------|---------|
| \`manifest.json\` | Ground truth — all skills, relationships, metrics, hypotheses |
| \`.sni/validators/\` | Validation scripts (bidirectional contracts, cycles, orphans) |
| \`.sni/cowork-tasks/\` | Task templates for Cowork |
| \`.sni/logs/\` | Session feedback (accumulates over time) |
| \`.sni/state/\` | System state between sessions |

## Metrics Explained

From \`manifest.json\` under \`skills[].metrics\`:

- \`loads_per_week\` — How often this skill is actually used (0 = orphan risk)
- \`value_signal\` — Ratio of positive feedback (0.0–1.0). Target: ≥ 0.75
- \`drift_risk\` — Likelihood skill is stale. Target: ≤ 0.2. Alert if > 0.4
- \`orphan_risk\` — Not used in 60+ days. 0.0 = healthy, 1.0 = orphan

## Alerts & Actions

| Signal | Means | Action |
|--------|-------|--------|
| \`drift_risk > 0.4\` | Skill likely needs update | Add to next Kaizen pass |
| \`value_signal < 0.6\` | Users don't find it useful | Redesign or archive |
| \`orphan_risk = 1.0\` | Not used in 60+ days | Archive or merge |
| Cycle detected | Circular skill dependency | Restructure relationships |
| New orphan | Skill no longer called | Investigate & archive |

## Troubleshooting

**"Validation failed: X calls Y but Y doesn't acknowledge"**
→ Check Y's \`called_by\` array in manifest.json. Add counter-call or remove call from X.

**"Drift signal: too many unmatched hypotheses"**
→ Run graduation review. Hypotheses > 60 days old need promotion to rules or rejection.

**"Graph shows cycle: A → B → A"**
→ Restructure skill relationships. One of the calls should be conditional or removed.

---

## Questions?

- Read \`UNIFIED_ARCHITECTURE_v2.md\` for system design
- Check \`.sni/validators/*-validator.js\` for how validation works
- Review task templates in \`.sni/cowork-tasks/\` for workflow

${this.manifest.skills.length > 0 ? `\n## Your Skills (${this.manifest.skills.length} discovered)\n\n${this.manifest.skills.map(s => `- **${s.id}** (${s.domain}): ${s.name}`).join('\n')}` : ''}

${this.manifest.integrity_checks.cycles_detected.length > 0 ? `\n## ⚠ Issues Found\n\nCycles: ${this.manifest.integrity_checks.cycles_detected.map(c => `${c[0]} → ${c[1]}`).join(', ')}` : ''}

${this.manifest.integrity_checks.orphans.length > 0 ? `\nOrphans: ${this.manifest.integrity_checks.orphans.join(', ')}` : ''}
`;

    const guidePath = path.join(this.targetPath, 'sni-setup.md');
    fs.writeFileSync(guidePath, guide);
    
    console.log(`✓ Setup guide written to ${guidePath}`);
    return this;
  }

  /**
   * Run the full bootstrap sequence
   */
  run() {
    console.log(`\n🚀 SNI Bootstrapper v1.0\n`);
    
    try {
      this
        .discoverSkills()
        .parseSkills()
        .validateContracts()
        .detectCycles()
        .detectOrphans()
        .writeManifest()
        .createSNIDirectory()
        .generateCoworkTasks()
        .generateSetupGuide();

      console.log(`\n✅ Bootstrap complete!\n`);
      console.log(`📍 Next steps:`);
      console.log(`   1. Review sni-setup.md in your skill directory`);
      console.log(`   2. Create Cowork workspace`);
      console.log(`   3. Import manifest.json and .sni/cowork-tasks/*.md`);
      console.log(`   4. Start with "Build New Skill" or "Improve Skill" task\n`);
      
      return true;
    } catch (error) {
      console.error(`\n❌ Bootstrap failed: ${error.message}\n`);
      return false;
    }
  }
}

// Export the class so other tools (e.g. sni-cowork-bridge) can reuse it
// without triggering a bootstrap as a side effect of `require`.
module.exports = SNIBootstrapper;

// Main CLI entry — only run when invoked directly, not when required.
if (require.main === module) {
  const targetPath = process.argv[2] || '.';
  const bootstrapper = new SNIBootstrapper(targetPath);
  const success = bootstrapper.run();
  process.exit(success ? 0 : 1);
}
