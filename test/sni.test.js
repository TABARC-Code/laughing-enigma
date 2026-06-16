'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SNIBootstrapper = require('../bin/sni-init.js');
const { checkContracts, checkCycles, checkOrphans } = require('../bin/sni-validator.js');

let dir;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sni-test-'));
  const mk = (name, body) => {
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    fs.writeFileSync(path.join(dir, name, 'SKILL.md'), body);
  };

  // alpha -> beta (acknowledged), beta -> gamma (NOT acknowledged => contract issue),
  // gamma -> alpha (creates a cycle). 'lonely' is an orphan.
  mk('alpha', [
    '# Alpha',
    '## Relationships',
    '### Feeds into',
    '- **beta** (CRITICAL): tokens',
    '### Fed by',
    '- **gamma**: feedback',
  ].join('\n'));

  mk('beta', [
    '# Beta',
    '## Relationships',
    '### Feeds into',
    '- **gamma** (MEDIUM): enriched',
    '### Fed by',
    '- **alpha**: tokens',
  ].join('\n'));

  mk('gamma', [
    '# Gamma',
    '## Relationships',
    '### Feeds into',
    '- **alpha** (LOW): closes the loop',
    '### Fed by',
    '- **alpha**: config',
  ].join('\n'));

  mk('lonely', '# Lonely\nNo relationships here.');
});

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

test('sni-init discovers and parses skills (ignoring node_modules/.git)', () => {
  // A nested node_modules with a SKILL.md should be ignored.
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'SKILL.md'), '# Ignored');

  const b = new SNIBootstrapper(dir);
  b.discoverSkills().parseSkills();

  const ids = b.manifest.skills.map(s => s.id).sort();
  assert.deepStrictEqual(ids, ['alpha', 'beta', 'gamma', 'lonely']);
});

test('validator flags the unidirectional beta -> gamma contract', () => {
  const b = new SNIBootstrapper(dir);
  b.discoverSkills().parseSkills();
  const { issues } = checkContracts(b.manifest);
  const unidir = issues.filter(i => i.type === 'unidirectional');
  assert.ok(unidir.some(i => i.from === 'beta' && i.to === 'gamma'),
    'expected beta -> gamma to be reported as unidirectional');
});

test('validator detects the gamma -> alpha cycle', () => {
  const b = new SNIBootstrapper(dir);
  b.discoverSkills().parseSkills();
  const { cycles } = checkCycles(b.manifest);
  assert.ok(cycles.length >= 1, 'expected at least one cycle');
});

test('validator reports the orphan skill', () => {
  const b = new SNIBootstrapper(dir);
  b.discoverSkills().parseSkills();
  const { orphans } = checkOrphans(b.manifest);
  assert.deepStrictEqual(orphans, ['lonely']);
});

test('full bootstrap writes a manifest without throwing', () => {
  const b = new SNIBootstrapper(dir);
  const ok = b.run();
  assert.strictEqual(ok, true);
  assert.ok(fs.existsSync(path.join(dir, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(dir, 'sni-setup.md')));
});
