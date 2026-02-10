#!/usr/bin/env node
// selfplay/runner/trace_compare.js -- Compare a C selfplay trace vs JS headless behavior
//
// Usage:
//   node selfplay/runner/trace_compare.js --trace traces/captured/trace_13296_valkyrie_score43.json
//   node selfplay/runner/trace_compare.js --trace ... --turns 50 --output /tmp/js_trace.json

import fs from 'fs';
import path from 'path';
import { runHeadless } from './headless_runner.js';

function parseArgs(argv) {
    const opts = { trace: null, turns: null, output: null, dx: 0, dy: 0, ignorePosition: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--trace=')) opts.trace = arg.split('=')[1];
        else if (arg === '--trace' && argv[i + 1]) opts.trace = argv[++i];
        else if (arg.startsWith('--turns=')) opts.turns = parseInt(arg.split('=')[1], 10);
        else if (arg === '--turns' && argv[i + 1]) opts.turns = parseInt(argv[++i], 10);
        else if (arg.startsWith('--output=')) opts.output = arg.split('=')[1];
        else if (arg === '--output' && argv[i + 1]) opts.output = argv[++i];
        else if (arg.startsWith('--dx=')) opts.dx = parseInt(arg.split('=')[1], 10);
        else if (arg === '--dx' && argv[i + 1]) opts.dx = parseInt(argv[++i], 10);
        else if (arg.startsWith('--dy=')) opts.dy = parseInt(arg.split('=')[1], 10);
        else if (arg === '--dy' && argv[i + 1]) opts.dy = parseInt(argv[++i], 10);
        else if (arg === '--ignore-position') opts.ignorePosition = true;
        else if (arg === '--help' || arg === '-h') {
            console.log('Usage: trace_compare.js --trace <file> [--turns N] [--output file] [--dx N] [--dy N] [--ignore-position]');
            process.exit(0);
        }
    }
    return opts;
}

function buildJsTrace(meta, turns) {
    const trace = {
        metadata: {
            seed: meta.seed,
            role: meta.role || 'Valkyrie',
            captureDate: new Date().toISOString(),
            maxTurns: meta.maxTurns,
        },
        turns: turns,
        interesting: [],
    };

    for (const t of turns) {
        if (t.action?.type === 'attack') {
            trace.interesting.push({ turn: t.turn, event: 'combat', detail: t.action.reason });
        }
        if (t.action?.type === 'quaff') {
            trace.interesting.push({ turn: t.turn, event: 'item_usage', detail: 'healing potion' });
        }
        if (t.action?.type === 'pray') {
            trace.interesting.push({ turn: t.turn, event: 'prayer', detail: t.action.reason });
        }
        if (t.hp != null && t.hpmax != null && t.hp < t.hpmax * 0.5) {
            trace.interesting.push({ turn: t.turn, event: 'low_hp', detail: `${t.hp}/${t.hpmax}` });
        }
    }

    return trace;
}

function compareTurns(cTurns, jsTurns, options) {
    const cByTurn = new Map();
    for (const t of cTurns) cByTurn.set(t.turn, t);

    const mismatches = [];
    for (const js of jsTurns) {
        const c = cByTurn.get(js.turn);
        if (!c) {
            mismatches.push({ turn: js.turn, field: 'missing', c: null, js });
            continue;
        }

        const jsPos = js.position
            ? { x: js.position.x + options.dx, y: js.position.y + options.dy }
            : js.position;

        const diffs = [];
        if (c.action?.type !== js.action?.type) diffs.push('action');
        if (!options.ignorePosition) {
            if (c.position?.x !== jsPos?.x || c.position?.y !== jsPos?.y) diffs.push('position');
        }
        if (c.hp !== js.hp || c.hpmax !== js.hpmax) diffs.push('hp');
        if (c.dlvl !== js.dlvl) diffs.push('dlvl');

        if (diffs.length) {
            mismatches.push({
                turn: js.turn,
                diffs,
                c: {
                    action: c.action?.type,
                    position: c.position,
                    hp: c.hp,
                    hpmax: c.hpmax,
                    dlvl: c.dlvl,
                },
                js: {
                    action: js.action?.type,
                    position: jsPos,
                    hp: js.hp,
                    hpmax: js.hpmax,
                    dlvl: js.dlvl,
                },
            });
        }
    }
    return mismatches;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (!opts.trace) {
        console.error('Missing --trace');
        process.exit(1);
    }

    const tracePath = path.resolve(opts.trace);
    const cTrace = JSON.parse(fs.readFileSync(tracePath, 'utf-8'));
    const maxTurns = opts.turns || (cTrace.turns ? cTrace.turns.length : 50);
    const seed = cTrace.metadata?.seed || cTrace.seed;

    const jsTurns = [];
    await runHeadless({
        seed,
        maxTurns,
        verbose: false,
        dumpMaps: false,
        colorless: true,
        onTurn: (info) => {
            jsTurns.push({
                turn: info.turn,
                hp: info.hp,
                hpmax: info.hpmax,
                dlvl: info.dlvl,
                position: info.position,
                action: {
                    type: info.action?.type,
                    key: info.action?.key,
                    reason: info.action?.reason,
                },
            });
        },
    });

    const mismatches = compareTurns(cTrace.turns || [], jsTurns, opts);
    console.log(`Compared ${jsTurns.length} JS turns to ${cTrace.turns?.length || 0} C turns`);
    console.log(`Mismatched turns: ${mismatches.length}`);
    mismatches.slice(0, 20).forEach(m => {
        if (m.field === 'missing') {
            console.log(`  turn ${m.turn}: missing in C trace`);
        } else {
            console.log(`  turn ${m.turn}: diffs=${m.diffs.join(',')} C=${JSON.stringify(m.c)} JS=${JSON.stringify(m.js)}`);
        }
    });

    if (opts.output) {
        const outTrace = buildJsTrace({ seed, maxTurns }, jsTurns);
        fs.writeFileSync(opts.output, JSON.stringify(outTrace, null, 2));
        console.log(`Wrote JS trace: ${opts.output}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
