#!/usr/bin/env node
/**
 * Validate session JSON files against the V4 schema.
 * Usage: node scripts/validate_session_schema.mjs [--all] [file...]
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SESSION_DIRS = [
  'test/comparison/sessions',
  'test/comparison/maps',
];

function findSessionFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    try {
      walkDir(dir, files);
    } catch (e) {
      // directory may not exist
    }
  }
  return files;
}

function walkDir(dir, files) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkDir(full, files);
    } else if (entry.endsWith('.session.json')) {
      files.push(full);
    }
  }
}

function validateSession(path) {
  const errors = [];
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return [`${path}: invalid JSON — ${e.message}`];
  }

  // version
  if (data.version !== 4) {
    errors.push(`version: expected 4, got ${data.version}`);
  }

  // env
  if (!data.env || typeof data.env !== 'object') {
    errors.push('env: missing or not an object');
  } else {
    if (typeof data.env.NETHACK_SEED !== 'string') {
      errors.push(`env.NETHACK_SEED: expected string, got ${typeof data.env.NETHACK_SEED}`);
    }
    if (typeof data.env.NETHACK_FIXED_DATETIME !== 'string') {
      errors.push(`env.NETHACK_FIXED_DATETIME: expected string, got ${typeof data.env.NETHACK_FIXED_DATETIME}`);
    }
  }

  // nethackrc
  if (typeof data.nethackrc !== 'string') {
    errors.push(`nethackrc: expected string, got ${typeof data.nethackrc}`);
  }

  // seed
  if (typeof data.seed !== 'number' || !Number.isInteger(data.seed)) {
    errors.push(`seed: expected integer, got ${typeof data.seed} (${data.seed})`);
  }

  // source
  if (data.source !== 'c') {
    errors.push(`source: expected "c", got ${JSON.stringify(data.source)}`);
  }

  // steps
  if (!Array.isArray(data.steps)) {
    errors.push('steps: missing or not an array');
  } else {
    if (data.steps.length === 0) {
      errors.push('steps: empty array');
    } else {
      // step 0 should have key: null
      const step0 = data.steps[0];
      if (step0.key !== null) {
        errors.push(`steps[0].key: expected null, got ${JSON.stringify(step0.key)}`);
      }
      // all steps should have rng array
      for (let i = 0; i < data.steps.length; i++) {
        const s = data.steps[i];
        if (!Array.isArray(s.rng)) {
          errors.push(`steps[${i}].rng: missing or not an array`);
          break; // don't spam
        }
        if (typeof s.screen !== 'string' && s.screen !== undefined) {
          errors.push(`steps[${i}].screen: expected string or undefined, got ${typeof s.screen}`);
          break;
        }
      }
    }
  }

  // recorded_with (optional but expected)
  if (data.recorded_with && typeof data.recorded_with === 'object') {
    if (typeof data.recorded_with.nethack_c !== 'string') {
      errors.push(`recorded_with.nethack_c: expected string`);
    }
  }

  // type (optional)
  const validTypes = ['gameplay', 'chargen', 'interface', 'option_test', 'wizload', 'special', 'map'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`type: "${data.type}" not in ${JSON.stringify(validTypes)}`);
  }

  // no options field (V3 artifact)
  if (data.options !== undefined && data.options !== null) {
    errors.push('options: V3 field should not be present in V4 sessions');
  }

  return errors;
}

// Main
const args = process.argv.slice(2);
const doAll = args.includes('--all');
let files;

if (doAll || args.length === 0) {
  files = findSessionFiles(SESSION_DIRS);
} else {
  files = args.filter(a => !a.startsWith('--'));
}

let totalErrors = 0;
let totalFiles = 0;
let passed = 0;

for (const file of files) {
  totalFiles++;
  const errors = validateSession(file);
  if (errors.length > 0) {
    const rel = relative('.', file);
    console.log(`FAIL  ${rel}`);
    for (const e of errors) {
      console.log(`  ${e}`);
    }
    totalErrors += errors.length;
  } else {
    passed++;
  }
}

console.log(`\n${passed}/${totalFiles} sessions valid, ${totalErrors} errors`);
process.exit(totalErrors > 0 ? 1 : 0);
