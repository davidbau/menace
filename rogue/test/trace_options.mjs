import { runSession } from './node_runner.mjs';

// Trace with more keys to see what happens
const steps = await runSession(42, 'oa\x1bof hello\r \x1b', {});
// Try: 'o' opens, 'a' toggles, '\x1b' quits options
// Then: 'o' opens again, 'f' edits str, 'hello\r' names, ' ' quits
for (let i = 0; i < steps.length; i++) {
  const msg = steps[i].screen[0].trim();
  console.log(`step ${i} key='${steps[i].key === '\r' ? '\\r' : steps[i].key === '\x1b' ? '\\x1b' : steps[i].key}': "${msg}"`);
}
