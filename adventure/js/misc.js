// misc.js - Utility functions for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (misc.c)
// Key functions: speak, rspeak, pspeak, setprm, getin, yes, vocab,
//   rndvoc, juggle, move, carry, drop, destroy, put, atdwrf, bug

// ---- Helper: absolute value ----
function IABS(n) { return Math.abs(n); }
function MOD(n, m) { return ((n % m) + m) % m; }

// ---- SETBIT / TSTBIT ----
export function setbit(bit) {
  return 1 << bit;
}

export function tstbit(mask, bit) {
  return (mask & (1 << bit)) !== 0;
}

// ---- Statement functions (matching funcs.h macros) ----
export function TOTING(G, obj) { return G.PLACE[obj] === -1; }
export function AT(G, obj) { return G.PLACE[obj] === G.LOC || G.FIXED[obj] === G.LOC; }
export function HERE(G, obj) { return AT(G, obj) || TOTING(G, obj); }

export function LIQ2(pbotl, G) {
  return (1 - pbotl) * G.WATER + Math.floor(pbotl / 2) * (G.WATER + G.OIL);
}
export function LIQ(G) {
  const p = G.PROP[G.BOTTLE];
  const pbotl = p < 0 ? -1 - p : p;
  return LIQ2(pbotl, G);
}
export function LIQLOC(G, loc) {
  const c = G.data.cond[loc];
  return LIQ2((MOD(Math.floor(c / 2) * 2, 8) - 5) * MOD(Math.floor(c / 4), 2) + 1, G);
}
export function CNDBIT(G, loc, n) { return tstbit(G.data.cond[loc], n); }
export function FORCED(G, loc) { return G.data.cond[loc] === 2; }
export function DARK(G) { return !CNDBIT(G, G.LOC, 0) && (G.PROP[G.LAMP] === 0 || !HERE(G, G.LAMP)); }
export function GSTONE(G, obj) { return obj === G.EMRALD || obj === G.RUBY || obj === G.AMBER || obj === G.SAPPH; }
export function FOREST(loc) { return loc >= 145 && loc <= 166; }
export function OUTSID(G, loc) {
  return loc <= 8 || FOREST(loc) || loc === G.data.plac[G.SAPPH] || loc === 180 || loc === 182;
}
export function INDEEP(G, loc) {
  return loc >= 15 && !OUTSID(G, loc) && loc !== 179;
}

// ---- SPEAK ----
// Messages in adventure-data.json are pre-decoded with parameter tokens.
// Tokens: %S = plural s, %1-%9 = number, %W = word, %L = lowercase word,
// %U = uppercase word, %C = capitalized word, %T = text, %B = blanks, %! = suppress.

export function speak(G, n) {
  if (n === 0 || !n) return;
  const msg = G.data.messages[String(n)];
  if (!msg) return;

  // Process parameter tokens
  let result = msg;
  let parmIdx = 1;

  // Replace tokens left to right
  let out = '';
  let i = 0;
  while (i < result.length) {
    if (result[i] === '%' && i + 1 < result.length) {
      const token = result[i + 1];
      if (token === '!') {
        // Suppress entire message
        return;
      } else if (token === 'S') {
        // Optional plural: 's' unless PARMS value is 1
        if (G.PARMS[parmIdx] === 1) {
          // no 's'
        } else {
          out += 's';
        }
        parmIdx++;
        i += 2;
      } else if (token >= '1' && token <= '9') {
        const width = parseInt(token);
        const val = IABS(G.PARMS[parmIdx]);
        let numStr = String(val);
        // Pad to width, with sign handling
        if (G.PARMS[parmIdx] < 0) {
          numStr = '-' + numStr;
        }
        while (numStr.length < width) numStr = ' ' + numStr;
        out += numStr;
        parmIdx++;
        i += 2;
      } else if (token === 'W') {
        // Word (the wd1/wd2 string from PARMS)
        const word = G.PARMS[parmIdx] || '';
        const word2 = G.PARMS[parmIdx + 1] || '';
        out += String(word) + String(word2);
        // Trim trailing spaces
        parmIdx += 2;
        i += 2;
      } else if (token === 'L') {
        // Lowercase word
        const word = String(G.PARMS[parmIdx] || '') + String(G.PARMS[parmIdx + 1] || '');
        out += word.toLowerCase();
        parmIdx += 2;
        i += 2;
      } else if (token === 'U') {
        // Uppercase word
        const word = String(G.PARMS[parmIdx] || '') + String(G.PARMS[parmIdx + 1] || '');
        out += word.toUpperCase();
        parmIdx += 2;
        i += 2;
      } else if (token === 'C') {
        // Capitalized word
        const word = String(G.PARMS[parmIdx] || '') + String(G.PARMS[parmIdx + 1] || '');
        const lower = word.toLowerCase();
        out += lower.charAt(0).toUpperCase() + lower.slice(1);
        parmIdx += 2;
        i += 2;
      } else if (token === 'T') {
        // Text from PARMS until -1
        while (G.PARMS[parmIdx] !== undefined && G.PARMS[parmIdx] >= 0) {
          out += String(G.PARMS[parmIdx]);
          parmIdx++;
        }
        parmIdx++; // skip the -1
        i += 2;
      } else if (token === 'B') {
        // Variable blanks
        const count = G.PARMS[parmIdx] || 0;
        for (let b = 0; b < count; b++) out += ' ';
        parmIdx++;
        i += 2;
      } else {
        out += result[i];
        i++;
      }
    } else {
      out += result[i];
      i++;
    }
  }

  // Output: blank line before message if BLKLIN
  if (G.BLKLIN) G.output('\n');
  // Split on \n and output each line
  const lines = out.split('\n');
  for (const line of lines) {
    G.output(line + '\n');
  }
}

export function rspeak(G, i) {
  if (i !== 0) speak(G, G.data.rtext[i]);
}

export function pspeak(G, msg, skip) {
  // Find the skip+1st message from PTEXT chain
  let m = G.data.ptext[msg];
  if (skip >= 0) {
    // Follow the chain: each message block in LINES is linked.
    // In the JSON, we have pre-decoded messages keyed by index.
    // PTEXT[msg] points to first message. We need to follow the chain.
    // The chain is: messages at index m, then the next block after the
    // end of this message, etc. We use the fact that consecutive PTEXT
    // messages for an object are at consecutive indices in the messages map.
    // Actually, we need to walk the chain using message structure.
    // In the pre-decoded JSON, we stored messages by their LINES index.
    // To follow the chain: start at m, skip over (skip+1) blocks.
    for (let i = 0; i <= skip; i++) {
      // Find next message block: scan forward in the original LINES structure
      // Since we don't have LINES, we look for the next message key after m
      const nextKey = findNextMessageKey(G, m);
      if (i < skip && nextKey) {
        m = nextKey;
      }
    }
  }
  speak(G, m);
}

// Find the next message block key after the current one
function findNextMessageKey(G, currentKey) {
  // Message keys in the JSON are string indices into LINES.
  // For PSPEAK, we need to follow the linked list of object descriptions.
  // The original C uses LINES[M] to find the end, then the next block starts after.
  // Since our JSON has pre-decoded messages, we need to find the next key.
  // We'll scan message keys sorted numerically to find the next one after currentKey.
  if (!G._sortedMessageKeys) {
    G._sortedMessageKeys = Object.keys(G.data.messages).map(Number).sort((a, b) => a - b);
  }
  const keys = G._sortedMessageKeys;
  const idx = keys.indexOf(currentKey);
  if (idx >= 0 && idx + 1 < keys.length) {
    return keys[idx + 1];
  }
  return null;
}

export function setprm(G, first, p1, p2) {
  if (first >= 25) bug(G, 29);
  G.PARMS[first] = p1;
  G.PARMS[first + 1] = p2;
}

// ---- GETIN (async) ----
// Read a line, parse into wd1/wd1x/wd2/wd2x using plain string vocabulary lookup.
export async function getin(G) {
  while (true) {
    if (G.BLKLIN) G.output('\n');
    G.output('> ');
    const line = await G.input();
    if (line === null || line === undefined) return false;

    const upper = line.toUpperCase().trim();
    if (G.BLKLIN && upper.length === 0) continue;

    const parts = upper.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) {
      if (G.BLKLIN) continue;
      G.wd1 = '';
      G.wd1x = '';
      G.wd2 = '';
      G.wd2x = '';
      G.WD1 = -1;
      G.WD1X = 0;
      G.WD2 = -1;
      G.WD2X = 0;
      return true;
    }

    // First word: first 5 chars, remainder in wd1x
    const w1 = parts[0];
    G.wd1 = w1.substring(0, 5);
    G.wd1x = w1.substring(5, 10);

    // Look up packed representation for C compatibility
    G.WD1 = makewd_from_string(G.wd1);
    G.WD1X = G.wd1x ? makewd_from_string(G.wd1x) : 0;

    if (parts.length >= 2) {
      const w2 = parts[1];
      G.wd2 = w2.substring(0, 5);
      G.wd2x = w2.substring(5, 10);
      G.WD2 = makewd_from_string(G.wd2);
      G.WD2X = G.wd2x ? makewd_from_string(G.wd2x) : 0;
    } else {
      G.wd2 = '';
      G.wd2x = '';
      G.WD2 = -1;
      G.WD2X = 0;
    }

    // Check for too many words
    if (parts.length > 2) {
      rspeak(G, 53);
      continue;
    }

    return true;
  }
}

// Convert a string (up to 5 uppercase letters) into the packed 30-bit word
// format that the C code uses. Letters A-Z map to 11-36.
export function makewd_from_string(s) {
  let word = 0;
  for (let i = 0; i < 5; i++) {
    word *= 64;
    if (i < s.length) {
      const ch = s.charCodeAt(i);
      if (ch >= 65 && ch <= 90) {
        word += ch - 65 + 11; // A=11, B=12, ..., Z=36
      } else if (ch >= 48 && ch <= 57) {
        word += ch - 48 + 64; // 0=64, ..., 9=73
      } else if (ch === 32) {
        word += 0;
      }
      // Other characters: leave as 0 (space)
    }
  }
  return word;
}

// Convert a MAKEWD-style numeric encoding to a packed word
// Each pair of decimal digits encodes a letter (01=A, 02=B, ..., 26=Z)
// The kludge: digit pair > 50 adds 5 to the letter value.
export function makewd(lettrs) {
  let result = 0;
  let mult = 1;
  let l = lettrs;
  while (l !== 0) {
    const pair = MOD(l, 50) + 10;
    result += mult * pair;
    mult *= 64;
    if (MOD(l, 100) > 50) result += mult * 5;
    l = Math.floor(l / 100);
  }
  const remaining = Math.floor(64 * 64 * 64 * 64 * 64 / mult);
  result *= remaining;
  return result;
}

// ---- YES (async) ----
export async function yes(G, x, y, z) {
  while (true) {
    rspeak(G, x);
    G.output('> ');
    const line = await G.input();
    if (line === null || line === undefined) return false;
    const upper = line.toUpperCase().trim();
    const word = upper.substring(0, 5);
    if (word === 'YES' || word === 'Y') {
      rspeak(G, y);
      return true;
    }
    if (word === 'NO' || word === 'N') {
      rspeak(G, z);
      return false;
    }
    rspeak(G, 185);
  }
}

// ---- VOCAB ----
// Look up a word (uppercase string, max 5 chars) in the vocabulary.
// Returns the KTAB definition, or -1 if not found.
// If init >= 0, only match entries where KTAB/1000 == init, and return KTAB % 1000.
export function vocab(G, word, init) {
  // word can be a packed integer or a string
  let packed;
  if (typeof word === 'string') {
    packed = makewd_from_string(word.toUpperCase().substring(0, 5));
  } else {
    packed = word;
  }

  const map = G.vocabMap;
  if (!map) return -1;

  // Search through vocabulary
  for (const entry of map) {
    if (init >= 0 && Math.floor(entry.ktab / 1000) !== init) continue;
    if (entry.atab === packed) {
      if (init >= 0) return entry.ktab % 1000;
      return entry.ktab;
    }
  }

  if (init >= 0) {
    bug(G, 5);
  }
  return -1;
}

// Vocab lookup using packed word (for C compatibility)
export function vocabPacked(G, id, init) {
  return vocab(G, id, init);
}

// ---- RNDVOC ----
// Generate a random vocabulary word with given second character.
export function rndvoc(G, charCode, force) {
  let result = force;
  if (result === 0) {
    result = 0;
    for (let i = 1; i <= 5; i++) {
      let j = 11 + G.rng.range(26);
      if (i === 2) j = charCode;
      result = result * 64 + j;
    }
  }

  // Find and replace the vocab entry with matching second char
  const div = 64 * 64 * 64;
  for (const entry of G.vocabMap) {
    if (MOD(Math.floor(entry.atab / div), 64) === charCode) {
      entry.atab = result;
      break;
    }
  }

  return result;
}

// ---- Object manipulation ----

export function juggle(G, object) {
  const i = G.PLACE[object];
  const j = G.FIXED[object];
  move(G, object, i);
  move(G, object + 100, j);
}

export function move(G, object, where) {
  let from;
  if (object > 100) {
    from = G.FIXED[object - 100];
  } else {
    from = G.PLACE[object];
  }
  if (from > 0 && from <= 300) carry(G, object, from);
  drop(G, object, where);
}

export function carry(G, object, where) {
  if (object <= 100) {
    if (G.PLACE[object] === -1) return;
    G.PLACE[object] = -1;
    G.HOLDNG++;
  }
  if (G.ATLOC[where] === object) {
    G.ATLOC[where] = G.LINK[object];
    return;
  }
  let temp = G.ATLOC[where];
  while (G.LINK[temp] !== object) {
    temp = G.LINK[temp];
  }
  G.LINK[temp] = G.LINK[object];
}

export function drop(G, object, where) {
  if (object <= 100) {
    if (G.PLACE[object] === -1) G.HOLDNG--;
    G.PLACE[object] = where;
  } else {
    G.FIXED[object - 100] = where;
  }
  if (where <= 0) return;
  G.LINK[object] = G.ATLOC[where];
  G.ATLOC[where] = object;
}

export function destroy(G, object) {
  move(G, object, 0);
}

export function put(G, object, where, pval) {
  move(G, object, where);
  return -1 - pval;
}

export function atdwrf(G, where) {
  let result = 0;
  if (G.DFLAG < 2) return 0;
  result = -1;
  for (let i = 1; i <= 5; i++) {
    if (G.DLOC[i] === where) return i;
    if (G.DLOC[i] !== 0) result = 0;
  }
  return result;
}

// ---- BUG ----
export function bug(G, num) {
  G.output('Fatal error ' + num + '.  See source code for interpretation.\n');
  throw new Error('Adventure bug ' + num);
}
