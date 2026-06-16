#!/usr/bin/env node

/**
 * sni-kaizen
 * Run a Kaizen pass on a drifting skill and persist the improvement.
 *
 * The standard is never finished — so an improvement that isn't written down
 * is "motion" that will recur. This tool converts a drift signal into a
 * written retrospective, a constitution entry, and a manifest record, then
 * clears the drift.
 *
 * Usage:
 *   node sni-kaizen.js list  <skills-directory>
 *   node sni-kaizen.js retro <skills-directory> [skill-id]
 *   node sni-kaizen.js complete <skills-directory> <skill-id> [--note "standard to formalise"]
 */

const fs = require('fs');
const path = require('path');
const {
  WASTES, QUESTIONS, selectCandidate, retroMarkdown, recordCompletion, constitutionEntry,
} = require('../lib/kaizen.js');

function loadManifest(dir) {
  const p = path.join(path.resolve(dir), 'manifest.json');
  if (!fs.existsSync(p)) {
    throw new Error(`manifest.json not found in ${dir}. Run sni-init first.`);
  }
  return { manifestPath: p, manifest: JSON.parse(fs.readFileSync(p, 'utf-8')) };
}

function logsDirFor(dir) {
  return path.join(path.resolve(dir), '.sni', 'logs');
}

function cmdList(dir) {
  const { manifest } = loadManifest(dir);
  const ranked = (manifest.skills || [])
    .slice()
    .sort((a, b) => (b.metrics?.drift_risk || 0) - (a.metrics?.drift_risk || 0));
  console.log('Kaizen candidates (highest drift first):\n');
  ranked.forEach(s => {
    const m = s.metrics || {};
    const flag = (m.drift_risk || 0) > 0.4 ? '⚠' : '·';
    console.log(`  ${flag} ${s.id.padEnd(28)} drift=${m.drift_risk ?? 0}  loads/wk=${m.loads_per_week ?? 0}  callers=${(s.called_by || []).length}`);
  });
  return 0;
}

function cmdRetro(dir, skillId) {
  const { manifest } = loadManifest(dir);
  const skill = selectCandidate(manifest, skillId);

  const retrosDir = path.join(path.resolve(dir), '.sni', 'retros');
  fs.mkdirSync(retrosDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const retroPath = path.join(retrosDir, `retro-${stamp}-${skill.id}.md`);
  fs.writeFileSync(retroPath, retroMarkdown(skill));

  console.log(`🔧 Kaizen pass target: ${skill.id}`);
  console.log(`   drift_risk=${skill.metrics?.drift_risk ?? 0}, loads/wk=${skill.metrics?.loads_per_week ?? 0}, callers=${(skill.called_by || []).length}`);
  console.log(`\n   Seven wastes to scan for:`);
  WASTES.forEach(([k]) => console.log(`     - ${k}`));
  console.log(`\n   Five questions waiting in the retro:`);
  QUESTIONS.forEach((q, i) => console.log(`     ${i + 1}. ${q.split(' — ')[0].split('. ')[0]}`));
  console.log(`\n📝 Retrospective scaffold written:\n   ${retroPath}`);
  console.log(`\n   Fill it in, then close the loop:`);
  console.log(`   node bin/sni-kaizen.js complete ${dir} ${skill.id} --note "the standard you formalised"`);
  return 0;
}

function findLatestRetro(dir, skillId) {
  const retrosDir = path.join(path.resolve(dir), '.sni', 'retros');
  let files;
  try {
    files = fs.readdirSync(retrosDir).filter(f => f.endsWith(`-${skillId}.md`));
  } catch (_) {
    return null;
  }
  if (files.length === 0) return null;
  files.sort();
  return path.join(retrosDir, files[files.length - 1]);
}

function cmdComplete(dir, skillId, note) {
  const { manifest, manifestPath } = loadManifest(dir);
  if (!skillId) throw new Error('complete requires a <skill-id>.');

  const skill = (manifest.skills || []).find(s => s.id === skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  const retroFile = findLatestRetro(dir, skillId);
  const { driftBefore, driftAfter } = recordCompletion(manifest, skillId, {
    note,
    retroFile: retroFile ? path.basename(retroFile) : null,
    logsDir: logsDirFor(dir),
  });

  // Persist the formalised standard to the project constitution — the site
  // where continuous improvement must be deposited to survive the session.
  if (note) {
    const constitutionPath = path.join(path.resolve(dir), 'CONSTITUTION.md');
    if (!fs.existsSync(constitutionPath)) {
      fs.writeFileSync(constitutionPath, '# Project Constitution\n\nThe living standard. Each Kaizen pass appends what it formalised.\n');
    }
    fs.appendFileSync(constitutionPath, constitutionEntry(skill, note));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ Kaizen pass recorded for ${skillId}`);
  console.log(`   drift_risk: ${driftBefore} → ${driftAfter}`);
  if (retroFile) console.log(`   retro: ${path.basename(retroFile)}`);
  if (note) console.log(`   formalised into CONSTITUTION.md`);
  return 0;
}

const USAGE = `
sni-kaizen — run a Kaizen pass and persist the improvement

Usage:
  node sni-kaizen.js list     <skills-directory>
  node sni-kaizen.js retro    <skills-directory> [skill-id]
  node sni-kaizen.js complete <skills-directory> <skill-id> [--note "standard"]
`;

if (require.main === module) {
  const [command, dir, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }

  // Parse a trailing --note "..."
  let note = '';
  const noteIdx = rest.indexOf('--note');
  if (noteIdx !== -1) {
    note = rest[noteIdx + 1] || '';
    rest.splice(noteIdx, 2);
  }
  const skillId = rest[0];

  try {
    let code = 0;
    switch (command) {
      case 'list': code = cmdList(dir || '.'); break;
      case 'retro': code = cmdRetro(dir || '.', skillId); break;
      case 'complete': code = cmdComplete(dir || '.', skillId, note); break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE);
        code = 1;
    }
    process.exit(code);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadManifest };
