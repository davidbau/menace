#!/usr/bin/env node
// Build script: reads mailcorpus_plain.js, XOR-encodes, writes mailcorpus.js
// Usage: node js/encode_corpus.mjs

import vm from 'vm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Read the plain corpus
const src = fs.readFileSync(path.join(__dir, 'mailcorpus_plain.js'), 'utf8');

// Strip export keywords and inject into a VM context
const ctx = {};
const modified = src.replace(/export const /g, 'const ');
const fullSrc = modified + `
ctx.SEED_MESSAGES = SEED_MESSAGES;
ctx.CORPUS = CORPUS;
ctx.REPLY_RULES = REPLY_RULES;
ctx.SOCIAL_ROUTING = SOCIAL_ROUTING;
ctx.SOCIAL_TEMPLATES = SOCIAL_TEMPLATES;
`;
vm.runInNewContext(fullSrc, { ctx });

// Serialize and XOR-encode
const json = JSON.stringify(ctx);
const KEY = 0x42;
const encoded = Buffer.from(json).map(b => b ^ KEY);
const blob = encoded.toString('base64');

// Write encoded mailcorpus.js
const out = `// js/mailcorpus.js -- XOR-encoded email corpus.
// Plaintext source: mailcorpus_plain.js
// To regenerate: node js/encode_corpus.mjs
const _k = 0x42;
function _d(s) {
  const b = atob(s);
  return JSON.parse(Array.from(b).map(c => String.fromCharCode(c.charCodeAt(0) ^ _k)).join(''));
}
const _x = _d('${blob}');
export const SEED_MESSAGES = _x.SEED_MESSAGES;
export const CORPUS = _x.CORPUS;
export const REPLY_RULES = _x.REPLY_RULES;
export const SOCIAL_ROUTING = _x.SOCIAL_ROUTING;
export const SOCIAL_TEMPLATES = _x.SOCIAL_TEMPLATES;
`;

fs.writeFileSync(path.join(__dir, 'mailcorpus.js'), out);
console.log(`Done. Encoded ${json.length} chars → ${blob.length} base64 chars.`);
