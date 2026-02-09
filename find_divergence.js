import { generateMapsWithRng } from './test/comparison/session_helpers.js';
import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('test/comparison/maps/seed16_maps_c.session.json', 'utf8'));
const result = generateMapsWithRng(16, 3);

const cRng = session.levels.find(l => l.depth === 3).rng;
const jsRng = result.rngLogs[3].rng;

console.log('Searching for exact divergence point...\n');

// Binary search for divergence
let left = 0;
let right = Math.min(jsRng.length, 1094);
let lastMatch = -1;

while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    // Check if calls 0-mid all match
    let allMatch = true;
    let cIdx = 0;
    let jsIdx = 0;

    while (jsIdx <= mid && cIdx < cRng.length) {
        // Skip midlog/composite in C
        if (cRng[cIdx][0] === '>' || cRng[cIdx][0] === '<') {
            cIdx++;
            continue;
        }
        const cCall = cRng[cIdx].split(' @')[0];
        if (cCall.startsWith('rne(') || cCall.startsWith('rnz(') || cCall.startsWith('d(')) {
            cIdx++;
            continue;
        }

        // Compare
        const jsCall = jsRng[jsIdx].split(' @')[0];
        if (jsCall !== cCall) {
            allMatch = false;
            break;
        }

        jsIdx++;
        cIdx++;
    }

    if (allMatch && jsIdx > mid) {
        // All calls up to mid matched
        lastMatch = mid;
        left = mid + 1;
    } else {
        right = mid - 1;
    }
}

console.log('Last matching call:', lastMatch);
console.log('First divergence at:', lastMatch + 1);
console.log('');

// Show context around divergence
const divPoint = lastMatch + 1;

// Map to C indices
let cIdx = 0;
let jsIdx = 0;
while (jsIdx < divPoint && cIdx < cRng.length) {
    if (cRng[cIdx][0] === '>' || cRng[cIdx][0] === '<') {
        cIdx++;
        continue;
    }
    const cCall = cRng[cIdx].split(' @')[0];
    if (cCall.startsWith('rne(') || cCall.startsWith('rnz(') || cCall.startsWith('d(')) {
        cIdx++;
        continue;
    }
    jsIdx++;
    cIdx++;
}

console.log('Context around first divergence:\n');
console.log('Last matching calls:');
for (let i = Math.max(0, divPoint - 3); i < divPoint; i++) {
    console.log(`JS[${i}]:`, jsRng[i]);
}

console.log('\nFirst diverging call:');
console.log(`JS[${divPoint}]:`, jsRng[divPoint]);

// Find corresponding C entry
let cDivIdx = cIdx;
console.log(`C[${cDivIdx}]:`, cRng[cDivIdx]);

console.log('\nNext few JS calls:');
for (let i = divPoint; i < Math.min(divPoint + 5, jsRng.length); i++) {
    console.log(`JS[${i}]:`, jsRng[i]);
}

console.log('\nNext few C calls (non-midlog/composite):');
let shown = 0;
for (let i = cDivIdx; i < cRng.length && shown < 5; i++) {
    if (cRng[i][0] === '>' || cRng[i][0] === '<') continue;
    const cCall = cRng[i].split(' @')[0];
    if (cCall.startsWith('rne(') || cCall.startsWith('rnz(') || cCall.startsWith('d(')) continue;
    console.log(`C[${i}]:`, cRng[i]);
    shown++;
}
