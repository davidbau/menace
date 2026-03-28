#!/usr/bin/env node
// Encode adventure-data.json with XOR to keep spoiler text out of git.
// Usage: node adventure/scripts/encode-data.mjs
// Reads:  adventure/js/adventure-data.json (plaintext)
// Writes: adventure/js/adventure-data.enc.js (encoded module)

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dir, '..', 'js', 'adventure-data.json');
const outPath = join(__dir, '..', 'js', 'adventure-data.enc.js');

const json = readFileSync(jsonPath, 'utf8');
const KEY = 0x57; // XOR key (different from mail corpus 0x42)
const encoded = Buffer.from(json).map(b => b ^ KEY);
const blob = encoded.toString('base64');

const out = `// adventure-data.enc.js — XOR-encoded adventure database.
// Plaintext source: adventure-data.json (not committed)
// To regenerate: node adventure/scripts/encode-data.mjs
const _k = 0x57;
function _d(s) {
  const b = atob(s);
  return JSON.parse(
    Array.from(b).map(c => String.fromCharCode(c.charCodeAt(0) ^ _k)).join('')
  );
}
const _data = _d('${blob}');
export default _data;
`;

writeFileSync(outPath, out);
console.log(`Encoded ${json.length} chars → ${blob.length} base64 chars → ${outPath}`);
