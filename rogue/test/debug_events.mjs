import { readFileSync } from 'fs';
import { runSession } from './node_runner.mjs';

const session = JSON.parse(readFileSync('/Users/davidbau/git/mazesofmenace/mac/rogue/test/sessions/seed3.json'));
const cSteps = session.steps.filter(s => s.key !== '\x00');
const keys = cSteps.map(s => s.key).join('');
const jsSteps = await runSession(3, keys);

// Find the first RNG divergence step
function rngNums(arr) { return (arr || []).filter(v => typeof v === 'number'); }
function rngEvents(arr) { return (arr || []).filter(v => typeof v === 'string'); }

let firstDiv = -1;
for (let i = 0; i < Math.min(jsSteps.length, cSteps.length); i++) {
  const jsNums = rngNums(jsSteps[i].rng);
  const cNums = rngNums(cSteps[i].rng);
  const minLen = Math.min(jsNums.length, cNums.length);
  let divPos = -1;
  for (let j = 0; j < minLen; j++) {
    if (jsNums[j] !== cNums[j]) { divPos = j; break; }
  }
  if (divPos >= 0 || jsNums.length !== cNums.length) { firstDiv = i; break; }
}

console.log('First RNG divergence at step:', firstDiv);
if (firstDiv >= 0) {
  const jsR = jsSteps[firstDiv].rng;
  const cR = cSteps[firstDiv].rng;
  const jsNums = rngNums(jsR);
  const cNums = rngNums(cR);
  const jsEvts = rngEvents(jsR);
  const cEvts = rngEvents(cR);
  console.log('JS events:', jsEvts);
  console.log('C  events:', cEvts);
  console.log('JS nums count:', jsNums.length, ' C nums count:', cNums.length);
  console.log('JS last 10:', jsNums.slice(-10));
  console.log('C  last 10:', cNums.slice(-10));

  // Find exact divergence position in nums
  const minLen = Math.min(jsNums.length, cNums.length);
  let divPos = minLen; // default: length differs
  for (let j = 0; j < minLen; j++) {
    if (jsNums[j] !== cNums[j]) { divPos = j; break; }
  }
  if (divPos < minLen) {
    console.log('First differing num at index', divPos);
    console.log('  JS:', jsNums.slice(Math.max(0,divPos-2), divPos+3));
    console.log('  C: ', cNums.slice(Math.max(0,divPos-2), divPos+3));
  } else {
    console.log('Nums agree up to', minLen, '- just length differs');
  }

  // Show JS events with their rng positions
  console.log('\nJS rng array (strings and first/last ints):');
  let jsIntCount = 0;
  for (const v of jsR) {
    if (typeof v === 'string') console.log('  [int#'+jsIntCount+']', v);
    else jsIntCount++;
  }

  // Show C events with their rng positions
  console.log('\nC rng array (strings and first/last ints):');
  let intCount = 0;
  for (const v of cR) {
    if (typeof v === 'string') console.log('  [int#'+intCount+']', v);
    else intCount++;
  }
}
