// topten.js -- High score list persistence and display
// C ref: topten.c — struct toptenentry, topten(), outentry()
//
// C↔JS function mapping summary:
//   observable_depth  → observable_depth (exported; trivial depth wrapper)
//   topten            → buildEntry + saveScore + loadScores (split; localStorage)
//   outheader         → formatTopTenHeader (renamed)
//   outentry          → formatTopTenEntry (renamed)
//   topten_print/bold → N/A (terminal output)
//   readentry/writeentry/writexlentry/discardexcess → N/A (file I/O)
//   free_ttlist       → N/A (GC handles memory in JS)
//   score_wanted/prscore/classmon → N/A (CLI scoring query mode)
//   formatkiller      → TODO (needs killer format, an(), game state)
//   encodexlogflags   → TODO (needs wizard/discover/roleplay flags)
//   encodeconduct     → TODO (needs u.uconduct, num_genocides, sokoban_in_play)
//   encodeachieve     → TODO (needs u.uachieved achievements array)

const TOPTEN_KEY = 'menace-topten';
const MAX_ENTRIES = 100; // C ref: sysopt.entrymax

// Safe localStorage access
function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (e) { return null; }
}

// Load all high scores from localStorage.
// Returns sorted array (highest first), or [] if none.
export function loadScores() {
    const s = storage();
    if (!s) return [];
    try {
        const json = s.getItem(TOPTEN_KEY);
        if (!json) return [];
        const data = JSON.parse(json);
        if (!Array.isArray(data)) return [];
        return data;
    } catch (e) {
        return [];
    }
}

// Save a new score entry. Inserts in sorted order, trims to MAX_ENTRIES.
// Returns the rank (1-based) of the new entry, or -1 if it didn't make the list.
export function saveScore(entry) {
    const s = storage();
    if (!s) return -1;
    try {
        const scores = loadScores();
        // Find insertion point (sorted descending by points)
        let rank = scores.length;
        for (let i = 0; i < scores.length; i++) {
            if (entry.points > scores[i].points) {
                rank = i;
                break;
            }
        }
        scores.splice(rank, 0, entry);
        // Trim to max
        if (scores.length > MAX_ENTRIES) {
            scores.length = MAX_ENTRIES;
        }
        s.setItem(TOPTEN_KEY, JSON.stringify(scores));
        // Return rank if entry is still in list
        if (rank < scores.length) return rank + 1; // 1-based
        return -1;
    } catch (e) {
        return -1;
    }
}

function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Build a TopTenEntry object from game state.
// C ref: topten.c topten() — populates struct toptenentry
// Takes roles/races arrays to avoid circular import.
export function buildEntry(player, gameOverReason, roles, races) {
    const now = new Date();
    const dateNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

    const role = roles[player.roleIndex];
    const race = races[player.race];

    return {
        points: player.score,
        deathlev: player.dungeonLevel,
        maxlvl: player.maxDungeonLevel,
        hp: player.uhp,
        maxhp: player.uhpmax,
        name: player.name,
        death: player.deathCause || gameOverReason || 'died',
        plrole: role ? role.abbr : '???',
        plrace: race ? capitalize(race.name) : '???',
        plgend: player.gender === 1 ? 'Fem' : 'Mal',
        plalign: player.alignment > 0 ? 'Law' : player.alignment < 0 ? 'Cha' : 'Neu',
        deathdate: dateNum,
        birthdate: dateNum,
        turns: player.turns,
    };
}

// Format a single topten entry for display.
// C ref: topten.c outentry() lines 945-1107
// Returns an array of lines (name line + death cause + stats).
export function formatTopTenEntry(entry, rank) {
    const nameStr = `${entry.name}-${entry.plrole}-${entry.plrace}-${entry.plgend}-${entry.plalign}`;
    const hpStr = entry.hp > 0 ? String(entry.hp) : '-';
    const line1 = `${String(rank).padStart(3)}  ${String(entry.points).padStart(9)}  ${nameStr}`;
    const line2 = `                  ${entry.death}`;
    const line3 = `                  on dungeon level ${entry.deathlev} [max ${entry.maxlvl}].  HP: ${hpStr} [${entry.maxhp}].  T:${entry.turns}`;
    return [line1, line2, line3];
}

// Format the header line for the topten display.
export function formatTopTenHeader() {
    return ` No       Points  Name`;
}

// Find where a new entry ranks among existing scores.
// Returns 1-based rank, or scores.length+1 if it would be last.
export function getPlayerRank(scores, newEntry) {
    for (let i = 0; i < scores.length; i++) {
        if (newEntry.points > scores[i].points) {
            return i + 1;
        }
    }
    return scores.length + 1;
}

// C ref: topten.c:183 — return the observable depth for the score record.
// In C this handles endgame planes (returning negative values), which are
// not yet in the JS port, so the depth passes through unchanged.
export function observable_depth(depth) {
    return depth;
}

// Get the topten localStorage key (for storage.js integration)
export { TOPTEN_KEY };

// Autotranslated from topten.c:207
export function discardexcess(rfile) {
  let c;
  do {
    c = fgetc(rfile);
  } while (c !== '\n' && c !== EOF);
}

// Autotranslated from topten.c:393
export function encodexlogflags(player) {
  let e = 0;
  if (wizard) {
    e |= 1 << 0;
  }
  if (discover) {
    e |= 1 << 1;
  }
  if (!player.uroleplay.numbones) {
    e |= 1 << 2;
  }
  if (player.uroleplay.reroll) {
    e |= 1 << 3;
  }
  return e;
}

// Autotranslated from topten.c:410
export function encodeconduct(player) {
  let e = 0;
  if (!player.uconduct.food) {
    e |= 1 << 0;
  }
  if (!player.uconduct.unvegan) {
    e |= 1 << 1;
  }
  if (!player.uconduct.unvegetarian) {
    e |= 1 << 2;
  }
  if (!player.uconduct.gnostic) {
    e |= 1 << 3;
  }
  if (!player.uconduct.weaphit) {
    e |= 1 << 4;
  }
  if (!player.uconduct.killer) {
    e |= 1 << 5;
  }
  if (!player.uconduct.literate) {
    e |= 1 << 6;
  }
  if (!player.uconduct.polypiles) {
    e |= 1 << 7;
  }
  if (!player.uconduct.polyselfs) {
    e |= 1 << 8;
  }
  if (!player.uconduct.wishes) {
    e |= 1 << 9;
  }
  if (!player.uconduct.wisharti) {
    e |= 1 << 10;
  }
  if (!num_genocides()) {
    e |= 1 << 11;
  }
  if (!player.uconduct.sokocheat && sokoban_in_play()) {
    e |= 1 << 12;
  }
  if (!player.uconduct.pets) {
    e |= 1 << 13;
  }
  return e;
}

// Autotranslated from topten.c:454
export function encodeachieve(secondlong, player) {
  let i, achidx, offset, r = 0;
  offset = secondlong ? (32 - 1) : 0;
  for (i = 0; player.uachieved[i]; ++i) {
    achidx = player.uachieved[i] - offset;
    if (achidx > 0 && achidx < 32) {
      r |= 1 << (achidx - 1);
    }
  }
  return r;
}

// Autotranslated from topten.c:479
export function add_achieveX(buf, achievement, condition) {
  if (condition) {
    if (buf[0] !== '\x00') { buf = (buf ?? '') + ("," ?? ''); }
    buf = (buf ?? '') + (achievement ?? '');
  }
}

// Autotranslated from topten.c:583
export function encode_extended_conducts(buf, game, player) {
  buf = '\0';
  add_achieveX(buf, "foodless", !player.uconduct.food);
  add_achieveX(buf, "vegan", !player.uconduct.unvegan);
  add_achieveX(buf, "vegetarian", !player.uconduct.unvegetarian);
  add_achieveX(buf, "atheist", !player.uconduct.gnostic);
  add_achieveX(buf, "weaponless", !player.uconduct.weaphit);
  add_achieveX(buf, "pacifist", !player.uconduct.killer);
  add_achieveX(buf, "illiterate", !player.uconduct.literate);
  add_achieveX(buf, "polyless", !player.uconduct.polypiles);
  add_achieveX(buf, "polyselfless", !player.uconduct.polyselfs);
  add_achieveX(buf, "wishless", !player.uconduct.wishes);
  add_achieveX(buf, "artiwishless", !player.uconduct.wisharti);
  add_achieveX(buf, "genocideless", !num_genocides());
  if (sokoban_in_play()) add_achieveX(buf, "sokoban", !player.uconduct.sokocheat);
  add_achieveX(buf, "blind", player.uroleplay.blind);
  add_achieveX(buf, "deaf", player.uroleplay.deaf);
  add_achieveX(buf, "nudist", player.uroleplay.nudist);
  add_achieveX(buf, "pauper", player.uroleplay.pauper);
  add_achieveX(buf, "bonesless", !game.flags.bones);
  add_achieveX(buf, "petless", !player.uconduct.pets);
  add_achieveX(buf, "unrerolled", !player.uroleplay.reroll);
  return buf;
}

// Autotranslated from topten.c:614
export function free_ttlist(tt) {
  // C dealloc_ttentry is free() — JS uses GC, nothing to do
}

// Autotranslated from topten.c:1421
export async function tt_oname(otmp) {
  let tt;
  if (!otmp) return  0;
  tt = get_rnd_toptenentry();
  if (!tt) return  0;
  set_corpsenm(otmp, classmon(tt.plrole));
  if (tt.plgend === 'F') otmp.spe = CORPSTAT_FEMALE;
  else if (tt.plgend === 'M') otmp.spe = CORPSTAT_MALE;
  otmp = await oname(otmp, tt.name, ONAME_NO_FLAGS);
  return otmp;
}

// Autotranslated from topten.c:1444
export function tt_doppel(mon) {
  let tt = rn2(13) ? get_rnd_toptenentry() : null, ret;
  if (!tt) ret = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
  else {
    if (tt.plgend === 'F') mon.female = 1;
    else if (tt.plgend === 'M') mon.female = 0;
    ret = classmon(tt.plrole);
    if (canseemon(mon)) christen_monst(mon, tt.name);
  }
  return ret;
}

// Autotranslated from topten.c:928
export function outheader() {
  let linebuf, bp;
  linebuf = " No Points Name";
  bp = eos(linebuf);
  while (bp < linebuf + COLNO - 9) {
     bp = ' ';
  }
  bp = "Hp [max]";
  topten_print(linebuf);
}

// --------------------------------------------------------------------------
// C-surface compatibility entrypoints (topten.c)
// --------------------------------------------------------------------------

export function formatkiller(entryOrCause) {
    if (!entryOrCause) return 'died';
    if (typeof entryOrCause === 'string') return entryOrCause;
    return String(entryOrCause.death || entryOrCause.deathCause || 'died');
}

export function topten_print(line) {
    return String(line ?? '');
}

export function topten_print_bold(line) {
    return `**${String(line ?? '')}**`;
}

export function readentry(line) {
    if (typeof line !== 'string' || !line.trim()) return null;
    try { return JSON.parse(line); } catch (_err) { return null; }
}

export function writeentry(entry) {
    return JSON.stringify(entry || {});
}

export function writexlentry(entry) {
    return writeentry(entry);
}

export function outentry(entry, rank = 1) {
    return formatTopTenEntry(entry || {}, rank);
}

export function score_wanted(_entry, _flags = 0) {
    return true;
}

export function prscore(limit = 10) {
    const scores = loadScores();
    const n = Math.max(0, Math.min(Number(limit) || 0, scores.length));
    const lines = [formatTopTenHeader()];
    for (let i = 0; i < n; i++) {
        lines.push(...formatTopTenEntry(scores[i], i + 1));
    }
    return lines;
}

export function classmon(roleAbbr) {
    const key = String(roleAbbr || '').toUpperCase();
    // Lightweight deterministic mapping for score surfaces.
    const roles = ['ARC', 'BAR', 'CAV', 'HEA', 'KNI', 'MON', 'PRI', 'RAN', 'ROG', 'SAM', 'TOU', 'VAL', 'WIZ'];
    const idx = roles.indexOf(key);
    return idx >= 0 ? idx : 0;
}

export function get_rnd_toptenentry() {
    const scores = loadScores();
    if (!scores.length) return null;
    const idx = Math.floor(Math.random() * scores.length);
    return scores[idx] || null;
}

export function encode_extended_achievements(secondlong, player) {
    return encodeachieve(!!secondlong, player || { uachieved: [] });
}

export function nsb_mung_line(line) {
    return Buffer.from(String(line ?? ''), 'utf8').toString('base64');
}

export function nsb_unmung_line(line) {
    try { return Buffer.from(String(line ?? ''), 'base64').toString('utf8'); }
    catch (_err) { return String(line ?? ''); }
}

export function topten(entry = null) {
    if (entry) saveScore(entry);
    return loadScores();
}
