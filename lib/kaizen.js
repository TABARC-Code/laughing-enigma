'use strict';

/**
 * lib/kaizen.js
 * The Kaizen retrospective: turn a drift signal into a persisted improvement.
 *
 * Grounded in "The Standard Is Never Finished" — the core insight being that
 * AI accumulates nothing between sessions, so the improvement must live in a
 * written system, not the tool. SNI's drift_risk surfaces *what* to improve;
 * Kaizen is the discipline that *captures* the improvement so it persists.
 *
 * This module is pure logic (no file IO) so it can be unit-tested; bin/sni-kaizen.js
 * wires it to the filesystem.
 */

const { applyMetrics } = require('./metrics.js');

// Taiichi Ohno's seven wastes, translated to AI-assisted work (from the article).
const WASTES = [
  ['overproduction', 'Generating more than was asked — unrequested features, padding, a thousand lines where a hundred would do.'],
  ['waiting', 'Cost of an unclear brief — rework that traces back to an ambiguity left unstated at the start.'],
  ['transport', 'Information lost between sessions — re-explaining context the system should already carry.'],
  ['over-processing', 'Abstraction or detail added for no current reason — a framework around a single function.'],
  ['inventory', 'Unused output — features generated but never integrated, alternatives written then discarded.'],
  ['motion', 'Correcting the same behaviour repeatedly — a verbal correction that was never written down recurs.'],
  ['defects', 'Rewrites — output reworked because direction, scope, or an assumption was wrong at the start.'],
];

// The five retrospective questions (five questions, five minutes).
const QUESTIONS = [
  'What waste appeared in this session? Name it using the categories above.',
  'What assumption did the AI make that I corrected? State it precisely — and write it into the standard now.',
  'What worked well enough to formalise? What prompted the better-than-usual output?',
  'Did scope drift? If it grew, was that intentional or velocity illusion?',
  'Is the constitution still accurate? If anything decided today contradicts it, update it now.',
];

/**
 * Pick the skill a Kaizen pass should target. If skillId is given, use it;
 * otherwise choose the highest drift_risk (ties broken by most callers).
 */
function selectCandidate(manifest, skillId) {
  const skills = manifest.skills || [];
  if (skillId) {
    const s = skills.find(x => x.id === skillId);
    if (!s) throw new Error(`Skill not found: ${skillId}`);
    return s;
  }
  if (skills.length === 0) throw new Error('No skills in manifest.');
  return skills
    .slice()
    .sort((a, b) => {
      const d = (b.metrics?.drift_risk || 0) - (a.metrics?.drift_risk || 0);
      if (d !== 0) return d;
      return (b.called_by?.length || 0) - (a.called_by?.length || 0);
    })[0];
}

/**
 * Render the retrospective scaffold for a skill — the written artifact the
 * human fills in. Pre-fills the waste taxonomy and the five questions.
 */
function retroMarkdown(skill, now = new Date()) {
  const m = skill.metrics || {};
  const wasteList = WASTES.map(([k, d]) => `- [ ] **${k}** — ${d}`).join('\n');
  const questions = QUESTIONS.map((q, i) => `### ${i + 1}. ${q}\n\n_…_\n`).join('\n');

  return `# Kaizen Retrospective — ${skill.id}

> Date: ${now.toISOString()}
> The standard is never finished. Capture the improvement here so it persists.

## Why this skill surfaced

- drift_risk: ${m.drift_risk ?? 'n/a'} (alert > 0.4)
- loads/week: ${m.loads_per_week ?? 'n/a'}
- value_signal: ${m.value_signal ?? 'n/a'}
- callers (depended-on by): ${(skill.called_by || []).length}
- last updated: ${skill.last_updated || 'unknown'}

## Waste check (tick what appeared)

${wasteList}

## The five questions

${questions}
## Formalised standard

> Anything below is appended to CONSTITUTION.md on \`sni-kaizen complete\` —
> this is the part that must be written down or it will be lost.

- …
`;
}

/**
 * Record completion of a Kaizen pass on a skill, in place:
 *  - appends a kaizen_history entry,
 *  - resets last_updated to now (clearing age-based drift),
 *  - recomputes metrics.
 * Returns { driftBefore, driftAfter }.
 */
function recordCompletion(manifest, skillId, opts = {}) {
  const now = opts.now || Date.now();
  const skill = (manifest.skills || []).find(s => s.id === skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  skill.metrics = skill.metrics || {};
  const driftBefore = skill.metrics.drift_risk || 0;

  skill.kaizen_history = skill.kaizen_history || [];
  skill.kaizen_history.push({
    date: new Date(now).toISOString(),
    drift_before: driftBefore,
    note: opts.note || '',
    retro_file: opts.retroFile || null,
  });

  // The pass is the edit: stamp the skill as freshly updated so drift clears.
  skill.last_updated = new Date(now).toISOString();

  applyMetrics(manifest, { logsDir: opts.logsDir, now });

  return { driftBefore, driftAfter: skill.metrics.drift_risk };
}

/**
 * A constitution entry — the persisted, formalised standard from a pass.
 */
function constitutionEntry(skill, note, now = new Date()) {
  return `\n## ${now.toISOString().slice(0, 10)} — ${skill.id}\n\n${note || '_(no standard recorded)_'}\n`;
}

module.exports = {
  WASTES,
  QUESTIONS,
  selectCandidate,
  retroMarkdown,
  recordCompletion,
  constitutionEntry,
};
