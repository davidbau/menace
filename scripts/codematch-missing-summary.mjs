#!/usr/bin/env node

import fs from 'node:fs';

const CODEMATCH_PATH = 'docs/CODEMATCH.md';

function parseTableColumns(line) {
    return line.split('|').map((s) => s.trim());
}

function main() {
    const text = fs.readFileSync(CODEMATCH_PATH, 'utf8');
    const lines = text.split(/\r?\n/);

    const naFiles = new Set();
    for (const line of lines) {
        const m = line.match(/^\| `\[N\/A\]` \| ([^|]+) \|/);
        if (m) naFiles.add(m[1].trim());
    }

    let currentCFile = null;
    const missingByFile = new Map();
    const funcsByFile = new Map();

    for (const line of lines) {
        const header = line.match(/^### ([^ ]+\.c) ->/);
        if (header) {
            currentCFile = header[1];
            continue;
        }
        if (line.startsWith('### ')) {
            currentCFile = null;
            continue;
        }
        if (!currentCFile || !line.startsWith('|')) continue;

        const cols = parseTableColumns(line);
        if (cols.length < 5) continue;

        const funcName = (cols[2] || '').replace(/`/g, '');
        const alignment = cols[4] || '';

        if (!alignment.includes('Missing')) continue;
        if (naFiles.has(currentCFile)) continue;

        missingByFile.set(currentCFile, (missingByFile.get(currentCFile) || 0) + 1);
        if (!funcsByFile.has(currentCFile)) funcsByFile.set(currentCFile, []);
        funcsByFile.get(currentCFile).push(funcName);
    }

    const sorted = [...missingByFile.entries()].sort((a, b) => b[1] - a[1]);
    const totalMissing = sorted.reduce((sum, [, count]) => sum + count, 0);

    console.log('CODEMATCH gameplay-missing summary');
    console.log(`Source: ${CODEMATCH_PATH}`);
    console.log(`N/A files ignored: ${naFiles.size}`);
    console.log(`Gameplay Missing rows: ${totalMissing}`);

    if (sorted.length === 0) {
        console.log('No gameplay Missing rows found.');
        return;
    }

    console.log('');
    console.log('Top missing buckets:');
    for (const [file, count] of sorted.slice(0, 20)) {
        console.log(`- ${file}: ${count}`);
    }

    const [topFile] = sorted[0];
    const sample = funcsByFile.get(topFile).slice(0, 20);
    console.log('');
    console.log(`Sample functions (${topFile}): ${sample.join(', ')}`);
}

main();
