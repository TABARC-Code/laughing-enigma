#!/usr/bin/env node

/**
 * sni-validator
 * Validate skill contracts and graph health for an SNI skill directory.
 *
 * Usage:
 *   node sni-validator.js contracts <skills-directory>
 *   node sni-validator.js cycles    <skills-directory>
 *   node sni-validator.js orphans   <skills-directory>
 *   node sni-validator.js audit     <skills-directory>
 *
 * Behaviour:
 *   - If <skills-directory>/manifest.json exists, it is validated as-is.
 *   - Otherwise the skill graph is built in-memory from SKILL.md files
 *     (using the same discovery/parsing logic as sni-init), so the
 *     validator can run before a manifest has ever been written.
 *
 * Exit code is non-zero when blocking issues are found (CI friendly):
 *   contracts -> non-zero if any contract is broken/unidirectional
 *   cycles    -> non-zero if any cycle is detected
 *   orphans   -> always zero (orphans are reported, not failed; they may
 *                be intentional)
 *   audit     -> non-zero if contracts are broken or cycles exist
 */

const fs = require('fs');
const path = require('path');
const SNIBootstrapper = require('./sni-init.js');

/**
 * Resolve a manifest for the given directory. Prefer an on-disk manifest.json;
 * otherwise build the graph in memory from SKILL.md files.
 */
function loadGraph(skillsDir) {
  const resolved = path.resolve(skillsDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }

  const manifestPath = path.join(resolved, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return { source: 'manifest.json', manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) };
  }

  // No manifest yet — build the graph in memory without writing anything.
  const bootstrapper = new SNIBootstrapper(resolved);
  bootstrapper.discoverSkills().parseSkills();
  return { source: 'SKILL.md files (in-memory)', manifest: bootstrapper.manifest };
}

/**
 * Check that every call has a matching counter-entry on the target.
 * Returns { issues: [...] }.
 */
function checkContracts(manifest) {
  const issues = [];
  const byId = new Map(manifest.skills.map(s => [s.id, s]));

  manifest.skills.forEach(skill => {
    (skill.calls || []).forEach(call => {
      const target = byId.get(call.target_id);
      if (!target) {
        issues.push({ type: 'missing-target', from: skill.id, to: call.target_id });
        return;
      }
      const counter = (target.called_by || []).find(c => c.source_id === skill.id);
      if (!counter) {
        issues.push({ type: 'unidirectional', from: skill.id, to: call.target_id });
      }
    });
  });

  return { issues };
}

/**
 * Detect cycles in the directed call graph. Returns the list of cyclic
 * back-edges discovered (each as a [from, to] pair).
 */
function checkCycles(manifest) {
  const byId = new Map(manifest.skills.map(s => [s.id, s]));
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  const dfs = (id) => {
    visited.add(id);
    recStack.add(id);

    const skill = byId.get(id);
    if (skill) {
      for (const call of skill.calls || []) {
        const target = call.target_id;
        if (!byId.has(target)) continue; // dangling targets are a contract issue, not a cycle
        if (!visited.has(target)) {
          if (dfs(target)) return true;
        } else if (recStack.has(target)) {
          cycles.push([id, target]);
          return true;
        }
      }
    }

    recStack.delete(id);
    return false;
  };

  manifest.skills.forEach(s => {
    if (!visited.has(s.id)) dfs(s.id);
  });

  return { cycles };
}

/**
 * Identify orphans (no inbound and no outbound edges).
 */
function checkOrphans(manifest) {
  const orphans = manifest.skills
    .filter(s => (s.called_by || []).length === 0 && (s.calls || []).length === 0)
    .map(s => s.id);
  return { orphans };
}

function reportContracts(manifest) {
  const { issues } = checkContracts(manifest);
  if (issues.length === 0) {
    console.log('✓ All contracts are bidirectional');
    return 0;
  }
  console.log(`✗ Found ${issues.length} contract issue(s):`);
  issues.forEach(i => {
    if (i.type === 'missing-target') {
      console.log(`  - ${i.from} → ${i.to}: target skill not found`);
    } else {
      console.log(`  - ${i.from} → ${i.to}: unidirectional (target has no matching called_by)`);
    }
  });
  return 1;
}

function reportCycles(manifest) {
  const { cycles } = checkCycles(manifest);
  if (cycles.length === 0) {
    console.log('✓ No cycles detected');
    return 0;
  }
  console.log(`✗ Found ${cycles.length} cycle(s):`);
  cycles.forEach(c => console.log(`  - ${c[0]} → ${c[1]} (back-edge closes a cycle)`));
  return 1;
}

function reportOrphans(manifest) {
  const { orphans } = checkOrphans(manifest);
  if (orphans.length === 0) {
    console.log('✓ No orphans');
  } else {
    console.log(`👻 Found ${orphans.length} orphan(s) (may be intentional):`);
    orphans.forEach(id => console.log(`  - ${id}`));
  }
  return 0; // orphans never fail the build
}

function reportAudit(manifest, source) {
  console.log(`SNI Audit — ${manifest.skills.length} skill(s) from ${source}\n`);

  console.log('## Contracts');
  const contractsCode = reportContracts(manifest);

  console.log('\n## Cycles');
  const cyclesCode = reportCycles(manifest);

  console.log('\n## Orphans');
  reportOrphans(manifest);

  // Surface metric coverage honestly: drift_risk / loads_per_week are not
  // computed by the current toolchain, so report when they are all zero.
  console.log('\n## Metric coverage');
  const driftMissing = manifest.skills.every(s => !s.metrics || (s.metrics.drift_risk || 0) === 0);
  const loadsMissing = manifest.skills.every(s => !s.metrics || (s.metrics.loads_per_week || 0) === 0);
  if (driftMissing) console.log('  ⚠ drift_risk is 0 for every skill — no drift signal is being computed');
  if (loadsMissing) console.log('  ⚠ loads_per_week is 0 for every skill — usage is not being tracked');
  if (!driftMissing && !loadsMissing) console.log('  ✓ drift and usage metrics are populated');

  return contractsCode || cyclesCode ? 1 : 0;
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  const skillsDir = process.argv[3] || '.';

  const usage = `
SNI Validator

Usage:
  node sni-validator.js contracts <skills-directory>
  node sni-validator.js cycles    <skills-directory>
  node sni-validator.js orphans   <skills-directory>
  node sni-validator.js audit     <skills-directory>
`;

  if (!command || command === 'help' || command === '--help') {
    console.log(usage);
    process.exit(command ? 0 : 1);
  }

  try {
    const { manifest, source } = loadGraph(skillsDir);
    let code = 0;
    switch (command) {
      case 'contracts': code = reportContracts(manifest); break;
      case 'cycles': code = reportCycles(manifest); break;
      case 'orphans': code = reportOrphans(manifest); break;
      case 'audit': code = reportAudit(manifest, source); break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(usage);
        code = 1;
    }
    process.exit(code);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadGraph, checkContracts, checkCycles, checkOrphans };
