#!/usr/bin/env node
/**
 * Check how many rooms JS Oracle generates and where RNG diverges
 */

import { initRng, enableRngLog, getRngLog, rn2, rnd } from './js/rng.js';
import { makelevel } from './js/dungeon.js';
import { DUNGEONS_OF_DOOM } from './js/special_levels.js';
import fs from 'fs';

const cTrace = JSON.parse(fs.readFileSync(
    'test/comparison/sessions/seed42_inventory_wizard.session.json', 'utf8'));

// Skip to makelevel start
initRng(42);
for (let i = 0; i < 271; i++) {
    const call = cTrace.startup.rng[i];
    const rn2Match = call.match(/^rn2\((\d+)\)/);
    const rndMatch = call.match(/^rnd\((\d+)\)/);
    if (rn2Match) {
        rn2(parseInt(rn2Match[1]));
    } else if (rndMatch) {
        rnd(parseInt(rndMatch[1]));
    }
}

enableRngLog(true);
const map = makelevel(5, DUNGEONS_OF_DOOM, 5);
const jsLog = getRngLog();

console.log(`JS Oracle generation:`);
console.log(`  Total rooms: ${map.nroom}`);
console.log(`  Total RNG calls: ${jsLog.length}`);
console.log();

// Extract C entries for comparison
const cEntries = cTrace.startup.rng.slice(271, 2762).map(entry => {
    const m = entry.match(/^(\S+\(\S+\))\s*=\s*(\S+)/);
    return m ? `${m[1]}=${m[2]}` : entry;
});

const jsEntries = jsLog.map(entry => {
    const m = entry.match(/^\d+ (\S+\(\S+\))\s*=\s*(\S+)/);
    return m ? `${m[1]}=${m[2]}` : entry;
});

// Find first divergence
let firstDiv = -1;
for (let i = 0; i < Math.min(jsEntries.length, cEntries.length); i++) {
    if (jsEntries[i] !== cEntries[i]) {
        firstDiv = i;
        break;
    }
}

console.log(`RNG Alignment:`);
if (firstDiv === -1) {
    console.log(`  ✓ Perfect match through ${Math.min(jsEntries.length, cEntries.length)} calls`);
} else {
    console.log(`  ✗ First divergence at call ${firstDiv}`);
    console.log(`    JS: ${jsEntries[firstDiv]}`);
    console.log(`    C:  ${cEntries[firstDiv]}`);
    console.log(`\n  Context (calls ${Math.max(0, firstDiv-3)} to ${firstDiv+3}):`);
    for (let i = Math.max(0, firstDiv-3); i <= Math.min(firstDiv+3, cEntries.length-1); i++) {
        const mark = i === firstDiv ? ' <<<' : '';
        console.log(`    [${i}] JS: ${jsEntries[i] || '(missing)'}  |  C: ${cEntries[i]}${mark}`);
    }
}
