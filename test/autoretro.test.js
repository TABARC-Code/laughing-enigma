'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SNICoworkBridge = require('../bin/sni-cowork-bridge.js');
const { retroMarkdown } = require('../lib/kaizen.js');

let dir;
const retros = () => {
  try { return fs.readdirSync(path.join(dir, '.sni', 'retros')); } catch { return []; }
};

before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sni-ar-')); });
after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

test('retroMarkdown renders a trigger line when given one', () => {
  const md = retroMarkdown({ id: 'x', metrics: {}, called_by: [] }, new Date(), { trigger: 'Negative feedback: docs outdated' });
  assert.match(md, /trigger: Negative feedback: docs outdated/);
});

test('positive feedback does NOT open a retro', () => {
  const bridge = new SNICoworkBridge(dir);
  const entry = bridge.recordFeedback('auth', 'positive', 'great');
  assert.strictEqual(entry.retro, undefined);
  assert.strictEqual(retros().length, 0);
});

test('negative feedback opens exactly one retro for the skill', () => {
  const bridge = new SNICoworkBridge(dir);
  const entry = bridge.recordFeedback('auth', 'negative', 'docs outdated');
  assert.ok(entry.retro, 'expected a retro path on the log entry');
  const files = retros().filter(f => f.endsWith('-auth.md'));
  assert.strictEqual(files.length, 1);
  const body = fs.readFileSync(entry.retro, 'utf-8');
  assert.match(body, /Negative feedback: docs outdated/);
});

test('a second negative the same day is deduped (no spam)', () => {
  const bridge = new SNICoworkBridge(dir);
  bridge.recordFeedback('auth', 'negative', 'still bad');
  const files = retros().filter(f => f.endsWith('-auth.md'));
  assert.strictEqual(files.length, 1, 'should not create a second retro for the same skill same day');
});

test('SNI_NO_AUTO_RETRO disables the reactive trigger', () => {
  process.env.SNI_NO_AUTO_RETRO = '1';
  try {
    const bridge = new SNICoworkBridge(dir);
    const entry = bridge.recordFeedback('billing', 'negative', 'broken');
    assert.strictEqual(entry.retro, undefined);
    assert.strictEqual(retros().filter(f => f.endsWith('-billing.md')).length, 0);
  } finally {
    delete process.env.SNI_NO_AUTO_RETRO;
  }
});
