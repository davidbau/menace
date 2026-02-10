#!/usr/bin/env node
// selfplay/runner/pet_rng_probe.js -- Compare per-turn RNG deltas for C vs JS
//
// Focused diagnostic for early divergence (pet movement).
//
// Usage:
//   node selfplay/runner/pet_rng_probe.js --seed 13296 --turns 9

import fs from 'fs';
import path from 'path';
import { Agent } from '../agent.js';
import { TmuxAdapter } from '../interface/tmux_adapter.js';
import { runHeadless } from './headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from '../../js/rng.js';

function parseArgs(argv) {
    const opts = { seed: 13296, turns: 9, showTurns: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--seed=')) opts.seed = parseInt(arg.split('=')[1], 10);
        else if (arg === '--seed' && argv[i + 1]) opts.seed = parseInt(argv[++i], 10);
        else if (arg.startsWith('--turns=')) opts.turns = parseInt(arg.split('=')[1], 10);
        else if (arg === '--turns' && argv[i + 1]) opts.turns = parseInt(argv[++i], 10);
        else if (arg.startsWith('--show-turn=')) opts.showTurns.push(parseInt(arg.split('=')[1], 10));
        else if (arg === '--show-turn' && argv[i + 1]) opts.showTurns.push(parseInt(argv[++i], 10));
        else if (arg === '--help' || arg === '-h') {
            console.log('Usage: pet_rng_probe.js --seed N --turns N [--show-turn N]');
            process.exit(0);
        }
    }
    return opts;
}

function readCLogLines(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    if (!text) return [];
    return text.split('\n');
}

function filterDogLines(lines) {
    if (!lines || !lines.length) return [];
    return lines.filter(line => line.includes('dog_move') || line.includes('dogmove.c') || line.includes('dogmove'));
}

async function collectCPerTurn(seed, turns) {
    const logPath = path.join('/tmp', `nethack_rng_${seed}.log`);
    try { fs.unlinkSync(logPath); } catch {}

    const adapter = new TmuxAdapter({ keyDelay: 80 });
    await adapter.start({
        seed,
        role: 'Valkyrie',
        race: 'human',
        name: 'Agent',
        gender: 'female',
        align: 'neutral',
        rngLogPath: logPath,
    });

    let lastCount = 0;
    const perTurn = [];
    const agent = new Agent(adapter, {
        maxTurns: turns,
        onTurn: (info) => {
            const lines = readCLogLines(logPath);
            const delta = lines.slice(lastCount);
            lastCount = lines.length;
            perTurn.push({
                turn: info.turn,
                count: delta.length,
                tail: delta.slice(-8),
                dog: filterDogLines(delta),
            });
        },
    });

    await agent.run();
    await adapter.stop();
    return perTurn;
}

async function collectJsPerTurn(seed, turns) {
    enableRngLog(true);
    let lastCount = 0;
    const perTurn = [];
    await runHeadless({
        seed,
        maxTurns: turns,
        colorless: true,
        dumpMaps: false,
        onTurn: (info) => {
            const log = getRngLog() || [];
            const delta = log.slice(lastCount);
            lastCount = log.length;
            perTurn.push({
                turn: info.turn,
                count: delta.length,
                tail: delta.slice(-8),
                dog: filterDogLines(delta),
            });
        },
    });
    disableRngLog();
    return perTurn;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const [cTurns, jsTurns] = await Promise.all([
        collectCPerTurn(opts.seed, opts.turns),
        collectJsPerTurn(opts.seed, opts.turns),
    ]);

    console.log(`Seed ${opts.seed}, turns ${opts.turns}`);
    console.log('Turn | C rng calls | JS rng calls');
    for (let i = 0; i < Math.max(cTurns.length, jsTurns.length); i++) {
        const c = cTurns[i];
        const j = jsTurns[i];
        const turn = (c?.turn ?? j?.turn ?? i + 1);
        const cCount = c ? String(c.count).padStart(4) : '   -';
        const jCount = j ? String(j.count).padStart(4) : '   -';
        console.log(`${String(turn).padStart(4)} | ${cCount}         | ${jCount}`);
    }

    const firstDiff = cTurns.findIndex((c, idx) => c && jsTurns[idx] && c.count !== jsTurns[idx].count);
    if (firstDiff >= 0) {
        const c = cTurns[firstDiff];
        const j = jsTurns[firstDiff];
        console.log(`\nFirst count mismatch at turn ${c.turn}: C=${c.count} JS=${j.count}`);
        console.log('C tail:');
        c.tail.forEach(line => console.log(`  ${line}`));
        console.log('JS tail:');
        j.tail.forEach(line => console.log(`  ${line}`));
    } else {
        console.log('\nNo per-turn RNG count mismatches detected.');
    }

    if (opts.showTurns.length) {
        const unique = [...new Set(opts.showTurns)].sort((a, b) => a - b);
        for (const t of unique) {
            const c = cTurns.find(x => x.turn === t);
            const j = jsTurns.find(x => x.turn === t);
            console.log(`\nTurn ${t} tails:`);
            console.log('C tail:');
            (c?.tail || []).forEach(line => console.log(`  ${line}`));
            console.log('JS tail:');
            (j?.tail || []).forEach(line => console.log(`  ${line}`));
            console.log('C dog_move entries:');
            (c?.dog || []).forEach(line => console.log(`  ${line}`));
            console.log('JS dog_move entries:');
            (j?.dog || []).forEach(line => console.log(`  ${line}`));
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
