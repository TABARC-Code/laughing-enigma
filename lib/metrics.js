'use strict';

/**
 * lib/metrics.js
 * Compute usage- and drift-related metrics for an SNI manifest.
 *
 * The drift model is a hybrid: it is deterministic and useful on day one
 * (pure staleness from a skill's real modification time), and it *evolves*
 * as feedback/usage logs accumulate (recent use suppresses drift, and the
 * number of dependents amplifies it).
 *
 *   drift_risk = clamp( age_drift * importance * usage_damping , 0, 1)
 *
 *     age_drift     = days_since_last_update / DRIFT_MAX_DAYS
 *                     -> 0.0 at 0 days, ALERT (0.4) at ~60 days, 1.0 at ~150 days
 *     importance    = 1 + IMPORTANCE_WEIGHT * (number of callers)
 *                     -> a stale skill many others depend on is riskier
 *     usage_damping = 1 / (1 + loads_per_week)
 *                     -> real, recent use pulls drift back down
 *
 * loads_per_week is derived from the feedback logs written by
 * sni-cowork-bridge into <skills>/.sni/logs/feedback-*.json, counted over a
 * trailing window.
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  DRIFT_MAX_DAYS: 150,       // age at which age_drift saturates to 1.0
  DRIFT_ALERT: 0.4,          // drift_risk above this needs a Kaizen pass
  DRIFT_TARGET: 0.2,         // healthy ceiling
  IMPORTANCE_WEIGHT: 0.15,   // per-caller amplification
  USAGE_WINDOW_DAYS: 28,     // trailing window for loads_per_week
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Read and parse feedback log entries from a logs directory.
 * Returns [] if the directory is absent or unreadable.
 */
function readFeedbackLogs(logsDir) {
  let files;
  try {
    files = fs.readdirSync(logsDir).filter(f => f.startsWith('feedback-') && f.endsWith('.json'));
  } catch (_) {
    return [];
  }
  const entries = [];
  for (const f of files) {
    try {
      entries.push(JSON.parse(fs.readFileSync(path.join(logsDir, f), 'utf-8')));
    } catch (_) {
      // Skip malformed log files rather than failing the whole rollup.
    }
  }
  return entries;
}

/**
 * loads_per_week for a skill: feedback entries in the trailing window,
 * normalised to a per-week rate.
 */
function computeLoadsPerWeek(skillId, logs, now, windowDays) {
  const cutoff = now - windowDays * MS_PER_DAY;
  const count = logs.reduce((n, log) => {
    if (log.skillId !== skillId) return n;
    const t = Date.parse(log.timestamp);
    if (Number.isNaN(t) || t < cutoff) return n;
    return n + 1;
  }, 0);
  const weeks = windowDays / 7;
  return round3(count / weeks);
}

/**
 * drift_risk for a single skill, given its already-computed loads_per_week.
 */
function computeDriftRisk(skill, now, cfg) {
  const t = Date.parse(skill.last_updated);
  const days = Number.isNaN(t) ? 0 : Math.max(0, (now - t) / MS_PER_DAY);

  const ageDrift = clamp(days / cfg.DRIFT_MAX_DAYS, 0, 1);
  const importance = 1 + cfg.IMPORTANCE_WEIGHT * ((skill.called_by || []).length);
  const loads = (skill.metrics && skill.metrics.loads_per_week) || 0;
  const usageDamping = 1 / (1 + loads);

  return round3(clamp(ageDrift * importance * usageDamping, 0, 1));
}

/**
 * Apply loads_per_week and drift_risk to every skill in the manifest,
 * in place. Returns the manifest.
 *
 * @param {object} manifest
 * @param {object} opts
 * @param {string} [opts.logsDir] directory of feedback-*.json logs
 * @param {number} [opts.now] epoch ms (defaults to Date.now())
 * @param {object} [opts.config] overrides for DEFAULTS
 */
function applyMetrics(manifest, opts = {}) {
  const cfg = Object.assign({}, DEFAULTS, opts.config || {});
  const now = opts.now || Date.now();
  const logs = opts.logsDir ? readFeedbackLogs(opts.logsDir) : [];

  (manifest.skills || []).forEach(skill => {
    skill.metrics = skill.metrics || {};
    // loads must be computed before drift (drift damps on it).
    skill.metrics.loads_per_week = computeLoadsPerWeek(skill.id, logs, now, cfg.USAGE_WINDOW_DAYS);
    skill.metrics.drift_risk = computeDriftRisk(skill, now, cfg);
  });

  return manifest;
}

module.exports = {
  DEFAULTS,
  clamp,
  round3,
  readFeedbackLogs,
  computeLoadsPerWeek,
  computeDriftRisk,
  applyMetrics,
};
