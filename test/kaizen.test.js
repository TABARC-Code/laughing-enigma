'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  WASTES, QUESTIONS, selectCandidate, retroMarkdown, recordCompletion,
} = require('../lib/kaizen.js');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-16T00:00:00.000Z');
const daysAgo = n => new Date(NOW - n * DAY).toISOString();

function manifest() {
  return {
    skills: [
      { id: 'fresh', last_updated: daysAgo(0), called_by: [], metrics: { drift_risk: 0 } },
      { id: 'stale', last_updated: daysAgo(90), called_by: [{}], metrics: { drift_risk: 0.69 } },
      { id: 'mid', last_updated: daysAgo(40), called_by: [], metrics: { drift_risk: 0.27 } },
    ],
  };
}

test('there are seven wastes and five questions', () => {
  assert.strictEqual(WASTES.length, 7);
  assert.strictEqual(QUESTIONS.length, 5);
});

test('selectCandidate picks the highest-drift skill by default', () => {
  assert.strictEqual(selectCandidate(manifest()).id, 'stale');
});

test('selectCandidate honours an explicit skill id', () => {
  assert.strictEqual(selectCandidate(manifest(), 'mid').id, 'mid');
});

test('selectCandidate throws on an unknown id', () => {
  assert.throws(() => selectCandidate(manifest(), 'nope'), /Skill not found/);
});

test('retroMarkdown embeds the skill, the seven wastes and five questions', () => {
  const md = retroMarkdown(manifest().skills[1], new Date(NOW));
  assert.match(md, /Kaizen Retrospective — stale/);
  WASTES.forEach(([k]) => assert.ok(md.includes(k), `expected waste "${k}" in retro`));
  assert.ok(md.includes('1.') && md.includes('5.'), 'expected numbered questions');
});

test('recordCompletion clears drift and writes a kaizen_history entry', () => {
  const m = manifest();
  const { driftBefore, driftAfter } = recordCompletion(m, 'stale', { now: NOW, note: 'no restructuring on "tidy up"' });
  assert.strictEqual(driftBefore, 0.69);
  assert.strictEqual(driftAfter, 0, 'drift should reset after the pass (last_updated is now)');
  const skill = m.skills.find(s => s.id === 'stale');
  assert.strictEqual(skill.kaizen_history.length, 1);
  assert.strictEqual(skill.kaizen_history[0].drift_before, 0.69);
  assert.match(skill.kaizen_history[0].note, /tidy up/);
});
