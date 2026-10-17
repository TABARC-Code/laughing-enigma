'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const {
  computeLoadsPerWeek,
  computeDriftRisk,
  applyMetrics,
  DEFAULTS,
} = require('../lib/metrics.js');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-16T00:00:00.000Z');

function daysAgo(n) {
  return new Date(NOW - n * DAY).toISOString();
}

test('loads_per_week counts only entries inside the trailing window', () => {
  const logs = [
    { skillId: 'a', timestamp: daysAgo(1) },
    { skillId: 'a', timestamp: daysAgo(10) },
    { skillId: 'a', timestamp: daysAgo(40) },   // outside 28d window
    { skillId: 'b', timestamp: daysAgo(2) },    // different skill
  ];
  // 2 of a's entries are within 28 days -> 2 / (28/7) = 2/4 = 0.5
  assert.strictEqual(computeLoadsPerWeek('a', logs, NOW, DEFAULTS.USAGE_WINDOW_DAYS), 0.5);
});

test('drift is pure staleness with no callers and no usage', () => {
  const skill = { last_updated: daysAgo(60), called_by: [], metrics: { loads_per_week: 0 } };
  // 60/150 = 0.4, exactly the alert threshold
  assert.strictEqual(computeDriftRisk(skill, NOW, DEFAULTS), 0.4);
});

test('drift is amplified by the number of callers (importance)', () => {
  const skill = { last_updated: daysAgo(60), called_by: [{}, {}], metrics: { loads_per_week: 0 } };
  // 0.4 * (1 + 0.15*2) = 0.4 * 1.3 = 0.52
  assert.strictEqual(computeDriftRisk(skill, NOW, DEFAULTS), 0.52);
});

test('drift is damped by recent usage (evolution)', () => {
  const skill = { last_updated: daysAgo(60), called_by: [], metrics: { loads_per_week: 1 } };
  // damping = 1/(1+1) = 0.5 -> 0.4 * 0.5 = 0.2
  assert.strictEqual(computeDriftRisk(skill, NOW, DEFAULTS), 0.2);
});

test('a brand-new skill has zero drift', () => {
  const skill = { last_updated: daysAgo(0), called_by: [{}, {}, {}], metrics: { loads_per_week: 0 } };
  assert.strictEqual(computeDriftRisk(skill, NOW, DEFAULTS), 0);
});

test('drift saturates at 1.0 and never exceeds it', () => {
  const skill = { last_updated: daysAgo(1000), called_by: [{}, {}, {}, {}], metrics: { loads_per_week: 0 } };
  assert.strictEqual(computeDriftRisk(skill, NOW, DEFAULTS), 1);
});

test('applyMetrics populates loads then drift for every skill', () => {
  const manifest = {
    skills: [
      { id: 'a', last_updated: daysAgo(60), called_by: [], metrics: {} },
      { id: 'b', last_updated: daysAgo(0), called_by: [], metrics: {} },
    ],
  };
  // no logsDir -> loads stay 0, drift is pure staleness
  applyMetrics(manifest, { now: NOW });
  assert.strictEqual(manifest.skills[0].metrics.loads_per_week, 0);
  assert.strictEqual(manifest.skills[0].metrics.drift_risk, 0.4);
  assert.strictEqual(manifest.skills[1].metrics.drift_risk, 0);
});
