#!/usr/bin/env node

/**
 * Convert V3 session files to V4 format.
 *
 * V4 adds:
 *   env: { NETHACK_SEED, NETHACK_FIXED_DATETIME, ... }
 *   nethackrc: ".nethackrc file contents"
 *
 * V3 fields (options, seed, regen) are preserved for backward compatibility.
 * The env + nethackrc fields are authoritative for startup configuration.
 *
 * Usage:
 *   node scripts/convert_session_v4.mjs [--dry-run] [--verify] [file...]
 *   node scripts/convert_session_v4.mjs --all [--dry-run] [--verify]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { buildNethackrc, buildSessionEnv, parseNethackrcFull } from '../js/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, '..', 'test', 'comparison', 'sessions');
const DEFAULT_DATETIME = '20000110090000';

function convertSession(session) {
    if (session.env && session.nethackrc) {
        return session; // already V4
    }

    const opts = session.options || {};
    const seed = session.seed;

    // Build character object from options
    const character = {};
    if (opts.name) character.name = opts.name;
    if (opts.role) character.role = opts.role;
    if (opts.race) character.race = opts.race;
    if (opts.gender) character.gender = opts.gender;
    if (opts.align) character.align = opts.align;

    // Build flags from options
    const flags = {};
    if (opts.autopickup === false) flags.pickup = false;
    if (opts.verbose === false) flags.verbose = false;
    if (opts.time === true) flags.time = true;
    if (opts.color === false) flags.color = false;
    if (opts.rest_on_space === true) flags.rest_on_space = true;
    if (opts.symset === 'DECgraphics') flags.DECgraphics = true;
    if (opts.tutorial === false) flags.tutorial = false;
    if (opts.pickup_types !== undefined && opts.pickup_types !== null) {
        flags.pickup_types = opts.pickup_types;
    }

    const wizard = opts.wizard === true;

    // Build .nethackrc — must match what C harness setup_home() writes.
    // The C harness always writes !autopickup, suppress_alert, symset:DECgraphics.
    // We generate the nethackrc to match, not from JS buildNethackrc (which
    // only writes flags differing from JS defaults).
    const rcLines = [];
    const charParts = [];
    if (character.name) charParts.push(`name:${character.name}`);
    if (character.role) charParts.push(`role:${character.role}`);
    if (character.race) charParts.push(`race:${character.race}`);
    if (character.gender) charParts.push(`gender:${character.gender}`);
    if (character.align) charParts.push(`align:${character.align}`);
    if (charParts.length > 0) rcLines.push(`OPTIONS=${charParts.join(',')}`);
    rcLines.push('OPTIONS=!autopickup');
    rcLines.push('OPTIONS=suppress_alert:3.4.3');
    rcLines.push('OPTIONS=symset:DECgraphics');
    if (wizard) rcLines.push(`WIZARD=${character.name || 'Wizard'}`);
    rcLines.push('');
    const nethackrc = rcLines.join('\n');

    // Build env
    const datetime = opts.datetime || DEFAULT_DATETIME;
    const env = buildSessionEnv(seed, datetime);

    // Add event env vars from regen if present
    const regen = session.regen || session.meta?.regen || {};
    const regenEnv = regen.env || {};
    if (regenEnv.NETHACK_EVENT_TEST_MOVE) env.NETHACK_EVENT_TEST_MOVE = regenEnv.NETHACK_EVENT_TEST_MOVE;
    if (regenEnv.NETHACK_EVENT_RUNSTEP) env.NETHACK_EVENT_RUNSTEP = regenEnv.NETHACK_EVENT_RUNSTEP;

    // Produce V4 session — preserve all existing fields, add env + nethackrc
    return {
        version: 4,
        env,
        nethackrc,
        // Preserve V3 fields for backward compatibility
        seed: session.seed,
        source: session.source,
        recorded_with: session.recorded_with,
        type: session.type,
        regen: session.regen,
        options: session.options,
        meta: session.meta,
        steps: session.steps,
    };
}

function verifyConversion(original, converted) {
    const errors = [];

    // Parse the generated nethackrc and verify it matches the original options
    const { character, flags, wizard } = parseNethackrcFull(converted.nethackrc);
    const opts = original.options || {};

    if (opts.name && character.name !== opts.name) {
        errors.push(`name: ${character.name} !== ${opts.name}`);
    }
    if (opts.role && character.role !== opts.role) {
        errors.push(`role: ${character.role} !== ${opts.role}`);
    }
    if (opts.race && character.race !== opts.race) {
        errors.push(`race: ${character.race} !== ${opts.race}`);
    }
    if (opts.gender && character.gender !== opts.gender) {
        errors.push(`gender: ${character.gender} !== ${opts.gender}`);
    }
    if (opts.align && character.align !== opts.align) {
        errors.push(`align: ${character.align} !== ${opts.align}`);
    }
    if (opts.wizard === true && !wizard) {
        errors.push(`wizard: expected true, got ${wizard}`);
    }
    if (opts.autopickup === false && flags.pickup !== false) {
        errors.push(`autopickup: expected false`);
    }

    // Verify env
    if (String(original.seed) !== converted.env.NETHACK_SEED) {
        errors.push(`seed: ${converted.env.NETHACK_SEED} !== ${original.seed}`);
    }

    return errors;
}

// --- CLI ---

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verify = args.includes('--verify');
const all = args.includes('--all');
const files = args.filter(a => !a.startsWith('--'));

let sessionFiles;
function findJsonFiles(dir) {
    const results = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        try {
            if (statSync(full).isDirectory()) {
                results.push(...findJsonFiles(full));
            } else if (entry.endsWith('.json')) {
                results.push(full);
            }
        } catch (e) { /* skip */ }
    }
    return results;
}

if (all) {
    sessionFiles = findJsonFiles(SESSIONS_DIR);
} else if (files.length > 0) {
    sessionFiles = files;
} else {
    console.log('Usage: node scripts/convert_session_v4.mjs [--dry-run] [--verify] [--all] [file...]');
    process.exit(1);
}

let converted = 0, skipped = 0, errors = 0;

for (const file of sessionFiles) {
    try {
        const raw = readFileSync(file, 'utf8');
        const session = JSON.parse(raw);

        if (session.env && session.nethackrc) {
            skipped++;
            continue;
        }

        const v4 = convertSession(session);

        if (verify) {
            const verifyErrors = verifyConversion(session, v4);
            if (verifyErrors.length > 0) {
                console.log(`VERIFY FAIL: ${basename(file)}`);
                for (const e of verifyErrors) console.log(`  ${e}`);
                errors++;
                continue;
            }
        }

        if (!dryRun) {
            writeFileSync(file, JSON.stringify(v4, null, 2) + '\n');
        }

        converted++;
        if (dryRun) {
            console.log(`[dry-run] ${basename(file)}: would convert`);
        }
    } catch (e) {
        console.log(`ERROR: ${basename(file)}: ${e.message}`);
        errors++;
    }
}

console.log(`\nConverted: ${converted}, Skipped: ${skipped}, Errors: ${errors}`);
if (dryRun) console.log('(dry run — no files written)');
