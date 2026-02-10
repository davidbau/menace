// test_c_depth1_rng_count.js - Count C's RNG calls at depth 1

import { readFileSync } from 'fs';

const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));
const cDepth1 = cSession.levels.find(l => l.depth === 1);

function isMidlogEntry(entry) {
    return entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

const cCalls = cDepth1.rng.filter(e => !isMidlogEntry(e)).length;
console.log('C RNG calls at depth 1:', cCalls);
console.log('JS should have:', 256 + 2218, '= 2474 calls before depth 2');
console.log('Match:', cCalls === 2474 ? 'YES' : 'NO');
