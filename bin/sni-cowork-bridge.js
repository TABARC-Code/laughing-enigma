#!/usr/bin/env node

/**
 * SNI-Cowork Bridge
 * Automated skill orchestration for Cowork
 * 
 * Enables:
 * - Auto-scaffold manifest.json from any Claude skill directory
 * - Create Cowork task templates (Build / Improve / Maintenance)
 * - Validate skill contracts bidirectionally
 * - Detect cycles, orphans, drift
 * - Generate setup & integration documentation
 * - Continuous feedback loops across Cowork tasks
 * 
 * Works with ANY Claude skill system, not just worldbuilding
 */

const fs = require('fs');
const path = require('path');
const { applyMetrics } = require('../lib/metrics.js');

class SNICoworkBridge {
  constructor(skillsDirectory) {
    this.skillsDir = path.resolve(skillsDirectory);
    this.manifestPath = path.join(this.skillsDir, 'manifest.json');
    this.sniDir = path.join(this.skillsDir, '.sni');
  }

  /**
   * Initialize SNI for a skill directory
   */
  initialize() {
    if (!fs.existsSync(this.skillsDir)) {
      throw new Error(`Directory not found: ${this.skillsDir}`);
    }

    if (fs.existsSync(this.manifestPath)) {
      console.log(`✓ manifest.json already exists`);
      return this.loadManifest();
    }

    console.log(`Initializing SNI in ${this.skillsDir}...`);

    // Run sni-init to scaffold everything. sni-init now exports the
    // bootstrapper class and only auto-runs when invoked directly, so this
    // require is side-effect free.
    const SNIBootstrapper = require('./sni-init.js');
    const bootstrapper = new SNIBootstrapper(this.skillsDir);
    bootstrapper.run();

    return this.loadManifest();
  }

  /**
   * Load existing manifest
   */
  loadManifest() {
    if (!fs.existsSync(this.manifestPath)) {
      throw new Error('manifest.json not found. Run sni-init first.');
    }

    return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
  }

  /**
   * Create a Cowork task for skill building/improvement
   */
  createCoworkTask(type = 'build') {
    const taskPath = path.join(this.sniDir, 'cowork-tasks', `task-${type}-skill.md`);
    if (!fs.existsSync(taskPath)) {
      throw new Error(`Task template not found: ${taskPath}`);
    }

    return fs.readFileSync(taskPath, 'utf-8');
  }

  /**
   * Log feedback from a Cowork task completion
   */
  recordFeedback(skillId, feedbackType, feedback) {
    const logsDir = path.join(this.sniDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      skillId,
      type: feedbackType, // 'positive', 'neutral', 'negative'
      feedback,
      sessionId: process.env.COWORK_SESSION_ID || 'unknown'
    };

    const logFile = path.join(logsDir, `feedback-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

    return logEntry;
  }

  /**
   * Roll up all feedback logs into manifest metrics
   */
  rollupMetrics() {
    const logsDir = path.join(this.sniDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      return {};
    }

    const manifest = this.loadManifest();
    const logFiles = fs.readdirSync(logsDir).filter(f => f.startsWith('feedback-'));

    // Aggregate feedback by skill
    const feedback = {};
    logFiles.forEach(logFile => {
      const log = JSON.parse(fs.readFileSync(path.join(logsDir, logFile), 'utf-8'));
      if (!feedback[log.skillId]) {
        feedback[log.skillId] = { positive: 0, neutral: 0, negative: 0 };
      }
      feedback[log.skillId][log.type]++;
    });

    // Update manifest metrics
    manifest.skills.forEach(skill => {
      if (feedback[skill.id]) {
        const fb = feedback[skill.id];
        skill.metrics.feedback_positive = fb.positive;
        skill.metrics.feedback_neutral = fb.neutral;
        skill.metrics.feedback_negative = fb.negative;

        const total = fb.positive + fb.negative;
        skill.metrics.value_signal = total > 0 ? fb.positive / total : 0;
      }
    });

    // Recompute loads_per_week and drift_risk from the same logs + file mtimes.
    applyMetrics(manifest, { logsDir });

    manifest.integrity_checks.last_run = new Date().toISOString();

    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
    return feedback;
  }

  /**
   * Generate Cowork integration guide (how to use in Cowork)
   */
  generateCoworkGuide() {
    const manifest = this.loadManifest();
    
    const guide = `# Using SNI Skills in Cowork

## Quick Start

1. **Open manifest.json** before starting any task
   - See current skill graph
   - Check for alerts (orphans, drift, cycles)
   - Note which skills need attention

2. **Choose a task type:**
   - **Build New Skill** — Creating a new skill (Phases 1–4)
   - **Improve Skill** — Kaizen pass on existing skill (Phase 5 first)
   - **Maintenance** — Weekly system health check

3. **Complete the task and provide feedback:**
   - Was this skill useful? (positive/neutral/negative)
   - Any issues with contracts or relationships?
   - New patterns or insights to capture?

## How Feedback Works

At task end, the system records:
- Which skill you worked on
- Your feedback (positive/neutral/negative)
- The task's outcome

After ~20 tasks, patterns emerge:
- **value_signal** shows usefulness ratio (target: ≥ 0.75)
- **drift_risk** shows staleness (alert if > 0.4)
- **orphan_risk** shows disuse (alert if = 1.0 for 60+ days)

These metrics feed directly into next month's Kaizen priorities.

## Your Skills (${manifest.skills.length} total)

${manifest.skills.map(s => {
  const health = s.metrics.drift_risk > 0.4 ? '⚠' : s.metrics.orphan_risk === 1.0 ? '👻' : '✓';
  return `${health} **${s.id}** — ${s.name} (${s.calls.length} outbound calls, ${s.called_by.length} callers)`;
}).join('\n')}

## Current Health

- Total skills: ${manifest.skills.length}
- Cycles detected: ${manifest.integrity_checks.cycles_detected.length}
- Orphans: ${manifest.integrity_checks.orphans.length}
- All contracts bidirectional: ${this.validateBidirectional(manifest) ? '✓' : '✗'}

${manifest.integrity_checks.cycles_detected.length > 0 ? `\n⚠ **Cycles found:** ${manifest.integrity_checks.cycles_detected.map(c => `${c[0]} → ${c[1]}`).join(', ')}\n   Action: Restructure relationships to break cycle` : ''}

${manifest.integrity_checks.orphans.length > 0 ? `\n👻 **Orphans:** ${manifest.integrity_checks.orphans.join(', ')}\n   Action: Archive or add to new skill that calls them` : ''}

## Example: Build a New Skill

**Task:** "Build Data Validation Skill"

1. Load manifest.json
   - Current state: 15 skills, no cycles, 1 orphan
   - Suggested improvement: Archive orphan before adding new skill

2. Work through phases (Phase 1–4)
   - Create SKILL.md with Relationships section
   - Document what you call (Feeds into)
   - Document what calls you (Fed by)
   - Document feedback loops

3. Finish task
   - System: "Feedback recorded. New skill 'data-validation' added to manifest."
   - System: "Mark as positive/neutral/negative on usefulness"
   - You: "positive—this fills a gap in our workflow"

4. On next maintenance run
   - metrics include value_signal = 1.0 (all feedback positive)
   - logs show "data-validation" used 3 times in first week
   - orphan_risk stays at 0.0

## Example: Improve Existing Skill

**Task:** "Kaizen Pass: Improve 'authentication' skill"

1. Load manifest.json
   - Alert: authentication shows drift_risk = 0.58 (stale!)
   - Context: Last updated 2 months ago, called by 4 other skills
   - Recommendation: Review for updates

2. Load target skill's SKILL.md
   - Check relationships (are calls still valid?)
   - Review feedback (value_signal = 0.67—lower than target 0.75)
   - Diagnose: Which parts are causing neutral/negative feedback?

3. Update and validate
   - Fix relationships if contracts changed
   - Update description if scope shifted
   - Run contract validator (confirm no regressions)

4. Finish task
   - You: "Updated auth flow documentation; fixed 2 broken call contracts"
   - System: "manifest updated. Drift signal cleared."
   - Next feedback cycle starts fresh

## Metrics Dashboard (manifest.json)

Check these values:

\`\`\`json
{
  "skills": [
    {
      "id": "skill-name",
      "metrics": {
        "loads_per_week": 2.3,        // How often used
        "value_signal": 0.87,         // Usefulness (0–1)
        "drift_risk": 0.12,           // Staleness (0–1)
        "orphan_risk": 0.0            // Disuse (0 or 1)
      }
    }
  ]
}
\`\`\`

**Healthy target:**
- loads_per_week > 0.5
- value_signal ≥ 0.75
- drift_risk ≤ 0.2
- orphan_risk = 0.0

**Alert thresholds:**
- drift_risk > 0.4 → Needs Kaizen
- value_signal < 0.6 → Redesign or archive
- orphan_risk = 1.0 → Archive or merge

## Scheduling

**Weekly:** Run Maintenance task (rolls up metrics, runs validators)
**Monthly:** Review drift signals, approve graduation candidates
**Quarterly:** Kaizen passes on high-risk skills

---

For full system documentation, see UNIFIED_ARCHITECTURE_v2.md and SKILL_BUILDER_INTEGRATION.md.
`;

    return guide;
  }

  validateBidirectional(manifest) {
    for (const skill of manifest.skills) {
      for (const call of skill.calls) {
        const target = manifest.skills.find(s => s.id === call.target_id);
        if (!target) return false;
        
        const counterCall = target.called_by.find(c => c.source_id === skill.id);
        if (!counterCall) return false;
      }
    }
    return true;
  }
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  const skillsDir = process.argv[3] || '.';

  try {
    const bridge = new SNICoworkBridge(skillsDir);

    switch (command) {
      case 'init':
        bridge.initialize();
        console.log('✅ SNI initialized');
        break;
      
      case 'guide':
        console.log(bridge.generateCoworkGuide());
        break;
      
      case 'feedback':
        const skillId = process.argv[4];
        const feedbackType = process.argv[5] || 'neutral';
        const feedback = process.argv[6] || '';
        bridge.recordFeedback(skillId, feedbackType, feedback);
        console.log(`✅ Feedback recorded for ${skillId}`);
        break;
      
      case 'rollup':
        const metrics = bridge.rollupMetrics();
        console.log('✅ Metrics rolled up');
        console.log(JSON.stringify(metrics, null, 2));
        break;
      
      default:
        console.log(`
SNI-Cowork Bridge v1.0

Usage:
  node sni-cowork-bridge.js init <skills-directory>
  node sni-cowork-bridge.js guide <skills-directory>
  node sni-cowork-bridge.js feedback <skills-directory> <skill-id> <type> <text>
  node sni-cowork-bridge.js rollup <skills-directory>

Commands:
  init       — Initialize SNI for a skill directory
  guide      — Generate Cowork integration guide
  feedback   — Record task feedback (type: positive/neutral/negative)
  rollup     — Roll up feedback logs into manifest metrics
`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = SNICoworkBridge;
