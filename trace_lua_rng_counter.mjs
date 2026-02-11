#!/usr/bin/env node
// Trace luaRngCounter initialization during themed room generation
import {initRng, enableRngLog, getRngLog, rn2} from './js/rng.js';
import {initLevelGeneration, makelevel} from './js/dungeon.js';
import * as sp_lev from './js/sp_lev.js';

// Patch getLevelState to intercept luaRngCounter access
const originalGetLevelState = sp_lev.getLevelState;
sp_lev.getLevelState = function() {
    const state = originalGetLevelState.call(this);
    return new Proxy(state, {
        get(target, prop) {
            if (prop === 'luaRngCounter') {
                console.log(`GET luaRngCounter: ${target[prop]}`);
                console.trace();
            }
            return target[prop];
        },
        set(target, prop, value) {
            if (prop === 'luaRngCounter') {
                console.log(`SET luaRngCounter: ${value}`);
                console.trace();
            }
            target[prop] = value;
            return true;
        }
    });
};

initRng(3);
enableRngLog();

// Simulate chargen pick_gend
rn2(1);

// Initialize and generate
initLevelGeneration(11);
const map = makelevel(1);

const log = getRngLog();
console.log('\n=== RNG TRACE ===');
console.log(`Total RNG calls: ${log.length}`);
console.log('\nCalls around 291-294:');
log.slice(289, 296).forEach((r, i) => console.log(`  [${289+i}] ${r}`));
