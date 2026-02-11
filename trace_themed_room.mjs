#!/usr/bin/env node
// Trace themed room generation to find extra Lua RNG call
import {initRng, enableRngLog, getRngLog, rn2} from './js/rng.js';
import {initLevelGeneration, makelevel} from './js/dungeon.js';

// Enable detailed debugging
process.env.DEBUG_THEMEROOMS = '1';

initRng(3);
enableRngLog();

// Simulate chargen pick_gend
rn2(1);

// Initialize and generate
initLevelGeneration(11);
const map = makelevel(1);

const log = getRngLog();

// Find where Lua RNG ends and build_room should start
const luaCalls = log.filter(r => r.includes('1030') || r.includes('1031') || r.includes('1032') || r.includes('1033') || r.includes('1034') || r.includes('1035') || r.includes('1036') || r.includes('1000'));

console.log('Last Lua RNG calls:');
const lastLua = log.findIndex(r => r.includes('1036'));
if (lastLua >= 0) {
    console.log(`Call ${lastLua}: ${log[lastLua]}`);
    console.log(`Call ${lastLua+1}: ${log[lastLua+1]}`);
    console.log(`Call ${lastLua+2}: ${log[lastLua+2]}`);
    console.log(`Call ${lastLua+3}: ${log[lastLua+3]}`);
} else {
    console.log('1036 not found, showing calls around 292:');
    log.slice(290, 296).forEach((r, i) => console.log(`  [${290+i}] ${r}`));
}
