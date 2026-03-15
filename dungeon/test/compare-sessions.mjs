#!/usr/bin/env node
// Compare Fortran and JS Zork parity sessions.
// Usage: node compare-sessions.mjs fortran-session.json js-session.json
//
// Highlights first divergence in output between the two sessions.

import { readFileSync } from 'fs';

const file1 = process.argv[2];
const file2 = process.argv[3];

if (!file1 || !file2) {
    console.error('Usage: node compare-sessions.mjs <session1.json> <session2.json>');
    process.exit(1);
}

const s1 = JSON.parse(readFileSync(file1, 'utf8'));
const s2 = JSON.parse(readFileSync(file2, 'utf8'));

console.log(`Comparing ${s1.source} (${s1.steps.length} steps) vs ${s2.source} (${s2.steps.length} steps)`);
console.log('');

const maxSteps = Math.max(s1.steps.length, s2.steps.length);
let divergences = 0;

for (let i = 0; i < maxSteps; i++) {
    const step1 = s1.steps[i];
    const step2 = s2.steps[i];

    if (!step1 || !step2) {
        console.log(`Step ${i + 1}: *** MISSING in ${!step1 ? s1.source : s2.source} ***`);
        divergences++;
        continue;
    }

    // Compare input
    const input1 = step1.input || '';
    const input2 = step2.input || '';
    if (input1 !== input2) {
        console.log(`Step ${i + 1}: INPUT MISMATCH`);
        console.log(`  ${s1.source}: "${input1}"`);
        console.log(`  ${s2.source}: "${input2}"`);
        divergences++;
    }

    // Compare output
    const out1 = (step1.output || []).map(s => s.trimEnd());
    const out2 = (step2.output || []).map(s => s.trimEnd());

    let outputMatch = true;
    const maxLines = Math.max(out1.length, out2.length);
    const diffs = [];

    for (let j = 0; j < maxLines; j++) {
        const l1 = (out1[j] || '').trimEnd();
        const l2 = (out2[j] || '').trimEnd();
        if (l1 !== l2) {
            outputMatch = false;
            diffs.push({ line: j, [s1.source]: l1, [s2.source]: l2 });
        }
    }

    if (!outputMatch) {
        console.log(`Step ${i + 1}: OUTPUT DIVERGENCE (input: "${input1}")`);

        // Show parse info if available
        if (step2.parse && step2.parse.prsa !== undefined) {
            console.log(`  JS parse: prsa=${step2.parse.prsa} prso=${step2.parse.prso} prsi=${step2.parse.prsi} prswon=${step2.parse.prswon}`);
        }

        for (const d of diffs.slice(0, 5)) {
            console.log(`  line ${d.line}:`);
            console.log(`    ${s1.source}: ${JSON.stringify(d[s1.source])}`);
            console.log(`    ${s2.source}: ${JSON.stringify(d[s2.source])}`);
        }
        if (diffs.length > 5) {
            console.log(`  ... and ${diffs.length - 5} more line differences`);
        }
        divergences++;
    } else {
        // Output matches
        const marker = '✅';
        console.log(`Step ${i + 1}: ${marker} output matches (input: "${input1}", ${out1.length} lines)`);
    }
}

console.log('');
console.log(`${divergences} divergence(s) found in ${maxSteps} steps.`);
process.exit(divergences > 0 ? 1 : 0);
