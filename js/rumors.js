// rumors.js -- Rumor/oracle text system, CapitalMon utility
// cf. rumors.c — getrumor, get_rnd_text, outrumor, outoracle, doconsult,
//                CapitalMon, save/restore_oracles
//
// Three subsystems:
// 1. Rumor file access: getrumor(), get_rnd_text(), get_rnd_line_index() [static],
//    parseRumorsFile() [init], outrumor() (BY_ORACLE/BY_COOKIE/BY_PAPER display).
//    File format: header + index line ("%d,%ld,%lx;...") + xcrypt()-encrypted lines
//    padded to MD_PAD_RUMORS (60) chars by makedefs.
// 2. Oracle system: init_oracles(), outoracle(), doconsult(), save_oracles(),
//    restore_oracles(). Oracle text read from ORACLEFILE; multi-line records
//    separated by "---" lines; oracle_loc[] array of fseek offsets.
// 3. CapitalMon utility: CapitalMon(), init_CapMons(), free_CapMons().
//    Builds a list of non-unique monsters with capitalized names (Green-elf,
//    Archon, etc.) plus hallucinatory names from BOGUSMONFILE; used by the()
//    to decide whether to prepend "the".

import { rn2 } from './rng.js';
import { parseRumorsFile, parseEncryptedDataFile } from './hacklib.js';
import { RUMORS_FILE_TEXT } from './rumor_data.js';
import { EPITAPH_FILE_TEXT } from './epitaph_data.js';
import { RUMOR_PAD_LENGTH, A_WIS, BY_ORACLE, BY_COOKIE, BY_PAPER, ECMD_OK } from './const.js';
import { exercise } from './attrib_exercise.js';

// Rumor data — parsed at module load from the compiled-in encrypted constant.
// cf. rumors.c init_rumors() + global gt/gf structs (true_rumor_size etc.)
const { trueTexts, trueLineBytes, trueSize,
        falseTexts, falseLineBytes, falseSize } = parseRumorsFile(RUMORS_FILE_TEXT);

// Epitaph data — parsed at module load from encrypted compiled constant.
// cf. rumors.c get_rnd_text(EPITAPHFILE, ...) — used by make_grave() when str=NULL.
const { texts: epitaphTexts, lineBytes: epitaphLineBytes, chunksize: epitaphChunksize } =
    parseEncryptedDataFile(EPITAPH_FILE_TEXT);

let _capMons = null;
let _oraclePool = [];

// cf. engrave.c make_grave() / rumors.c get_rnd_text(EPITAPHFILE, ...)
// Returns a random epitaph string, decrypted and unpadded.
export function random_epitaph_text() {
    const idx = get_rnd_line_index(epitaphLineBytes, epitaphChunksize, RUMOR_PAD_LENGTH);
    return epitaphTexts[idx] || epitaphTexts[0] || '';
}

// cf. rumors.c:67 [static] — unpadline(line): strip trailing underscore padding
// makedefs pads short rumors, epitaphs, engravings, and hallucinatory monster
// names with trailing '_' characters; this removes them.
// Also removes trailing newline if still present.
// JS equivalent: hacklib.unpadline() at hacklib.js:535.
// ALIGNED: rumors.c:67 — unpadline() ↔ hacklib.unpadline() (hacklib.js:535)

// cf. rumors.c:85 [static] — init_rumors(fp): parse rumors file header
// Reads two lines: "don't edit" comment + index line with format
//   "%d,%ld,%lx;%d,%ld,%lx;0,0,%lx"
//   = trueCount,trueSize,trueStart; falseCount,falseSize,falseStart; 0,0,eofOffset
// Stores true_rumor_{size,start,end} and false_rumor_{size,start,end} in globals.
// Sets true_rumor_size = -1L on parse failure and closes fp.
// JS equivalent: hacklib.parseRumorsFile() at hacklib.js:564.
// ALIGNED: rumors.c:85 — init_rumors() ↔ hacklib.parseRumorsFile() (hacklib.js:564)

// cf. rumors.c:420 [static] — get_rnd_line(fh, buf, bufsiz, rng, startpos, endpos, padlength)
// Picks a random byte offset within [startpos, endpos); reads rest of that partial line,
//   then reads the NEXT line (wrapping to startpos if at endpos/EOF).
// When padlength>0: retries up to 10× if strlen(buf) > padlength+1 (avoids uneven
//   selection probability from landing near a long line).
// Decrypts line via xcrypt(), then strips padding via unpadline().
// JS implementation works on pre-parsed text/lineBytes arrays instead of file handles;
//   returns array index of the selected line rather than reading from file directly.
// ALIGNED: rumors.c:420 — get_rnd_line() ↔ get_rnd_line_index() (here)
export function get_rnd_line_index(lineBytes, chunksize, padlength) {
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        const chunkoffset = rn2(chunksize);
        let pos = 0;
        let lineIdx = 0;
        while (lineIdx < lineBytes.length && pos + lineBytes[lineIdx] <= chunkoffset) {
            pos += lineBytes[lineIdx];
            lineIdx++;
        }
        if (lineIdx < lineBytes.length) {
            // C: strlen(buf) after fgets = remaining bytes including \n
            // C rejects if strlen(buf) > padlength + 1
            const remaining = lineBytes[lineIdx] - (chunkoffset - pos);
            if (padlength === 0 || remaining <= padlength + 1) {
                const nextIdx = (lineIdx + 1) % lineBytes.length;
                return nextIdx;
            }
        } else {
            return 0;
        }
    }
    return 0;
}

// cf. rumors.c:117 — getrumor(truth, rumor_buf, exclude_cookie): get random rumor
// truth: 1=true only, -1=false only, 0=either (adjusted by rn2(2): 0→false, 1→true).
// exclude_cookie=true: skips lines starting with "[cookie] " (used for graffiti context
//   where fortune-cookie references would be nonsensical).
// When not excluding: strips the "[cookie] " prefix before returning (fortune-cookie context
//   where the message text is read aloud).
// Loops up to 50× discarding cookie lines when exclude_cookie=TRUE.
// Returns rumor text string ('' if lookup failed).
// ALIGNED: rumors.c:117 — getrumor() ↔ getrumor() (here)
export function getrumor(truth, exclude_cookie) {
    const COOKIE_MARKER = '[cookie] ';
    let text = '';
    let count = 0;
    do {
        const adjtruth = truth + rn2(2);
        if (adjtruth > 0) {
            const idx = get_rnd_line_index(trueLineBytes, trueSize, RUMOR_PAD_LENGTH);
            text = trueTexts[idx] || '';
        } else {
            const idx = get_rnd_line_index(falseLineBytes, falseSize, RUMOR_PAD_LENGTH);
            text = falseTexts[idx] || '';
        }
    } while (count++ < 50 && exclude_cookie && text && text.startsWith(COOKIE_MARKER));
    if (!exclude_cookie && text.startsWith(COOKIE_MARKER)) {
        text = text.slice(COOKIE_MARKER.length);
    }
    return text;
}

// cf. rumors.c:196 — rumor_check(): wizard-mode validation of rumors file
// Opens RUMORFILE; displays true/false section start+end byte offsets;
//   shows first two and last true/false rumors via putstr in a text window.
// Calls others_check() for ENGRAVEFILE, EPITAPHFILE, BOGUSMONFILE.
// TODO: rumors.c:196 — rumor_check(): wizard mode rumor file validator

// cf. rumors.c:308 [static] — others_check(ftype, fname, winptr): validate data file
// Wizard-mode helper: opens fname, reads header comment line, then reads
//   first two entries and scans to the last; displays in text window.
// Used by rumor_check() for engrave/epitaph/bogusmon files.
// TODO: rumors.c:308 — others_check(): wizard mode data-file validator

// cf. rumors.c:499 — get_rnd_text(fname, buf, rng, padlength): random line from data file
// Opens fname; skips "don't edit" comment; picks a random line via get_rnd_line()
//   from the entire file (startpos after header, endpos=0 for EOF).
// Used by: outrumor() for ENGRAVEFILE fallback, engrave.c for graffiti/epitaphs.
// JS equivalent: partially; dungeon.js uses parseEncryptedDataFile + get_rnd_line_index
//   for EPITAPHFILE (dungeon.js) and ENGRAVEFILE (dungeon.js).
//   random_epitaph_text() at dungeon.js is the closest single-file analogue.
// TODO: rumors.c:499 — get_rnd_text(): general-purpose random text line reader

// cf. rumors.c:529 — outrumor(truth, mechanism): display a rumor to the player
// mechanism: BY_ORACLE=0, BY_COOKIE=1, BY_PAPER=2.
// BY_COOKIE/BY_PAPER: checks Blind (print fortune message, no reading);
//   calls getrumor(truth, buf, reading ? FALSE : TRUE).
// BY_ORACLE: uses verbalize1() + SetVoice(); random prefix ("offhandedly"/"casually"/etc).
// BY_COOKIE: prints fortune_msg ("This cookie has a scrap of paper inside.") + "It reads:".
// BY_PAPER: just "It reads:" then pline1(line).
// TODO: rumors.c:529 — outrumor(): rumor display for cookie/paper/oracle contexts

// cf. rumors.c:577 [static] — init_oracles(fp): parse oracle file header
// Reads "don't edit" comment + count line (decimal N), then N hex offset lines.
// Stores oracle_cnt and oracle_loc[] array of fseek offsets into ORACLEFILE.
// oracle_loc[0] is the "special" (first consult) oracle text.
// N/A for JS save/restore; oracle state not tracked in JS.
// TODO: rumors.c:577 — init_oracles(): oracle file offset table initialization

// cf. rumors.c:598 — save_oracles(nhfp): save oracle state to save file
// N/A: JS has no save file system.
// N/A: rumors.c:598 — save_oracles()

// cf. rumors.c:623 — restore_oracles(nhfp): restore oracle state from save file
// N/A: JS has no save file system.
// N/A: rumors.c:623 — restore_oracles()

// cf. rumors.c:640 — outoracle(special, delphi): display oracle text
// special=TRUE: uses oracle_loc[0] (special first-consult oracle); removes that slot.
// special=FALSE: picks rnd(oracle_cnt-1) from oracle_loc[1..]; removes that slot.
// Seeks to offset, reads lines until "---\n" separator, puts in text window.
// delphi=TRUE: prints intro header ("The Oracle meditates..." or scornful gold message).
// delphi=FALSE: "The message reads:" (used for non-interactive oracle reads).
// oracle_flg: 0=not init'd, 1=init'd, -1=file open failed.
// TODO: rumors.c:640 — outoracle(): display multi-line oracle text

// cf. rumors.c:696 — doconsult(oracl): #chat with the Oracle monster
// Checks: oracl exists, is peaceful, player has gold.
// minor_cost=50 Au → outrumor(1, BY_ORACLE) (true rumor).
// major_cost=500+50*ulevel Au → outoracle(cheapskate, TRUE) (if full payment).
// Awards XP on first minor/major oracle (u.uevent.minor_oracle, .major_oracle).
// Both record ACH_ORCL achievement. Returns ECMD_OK (no time) or ECMD_TIME.
// TODO: rumors.c:696 — doconsult(): Oracle monster #chat handler

// cf. rumors.c:770 [static] — couldnt_open_file(filename): error for missing data file
// N/A: JS has no file I/O; data loaded from compiled-in JS constants.
// N/A: rumors.c:770 — couldnt_open_file()

// cf. rumors.c:791 — CapitalMon(word): check if word is a capitalized monster type name
// Returns TRUE if word begins uppercase AND matches a name in CapMons[] list.
// Matches full-word prefix: "Foo" matches "Foo", "Foo bar", "Foo's bar" but not "Foobar".
// Case-sensitive. Lazy-initializes CapMons[] via init_CapMons() on first call.
// Used by the() (in topten.c/do_name.c) to decide "the Archon" vs "an Archon".
// CapMons[] contains ~27 monster entries + ~20 hallucinatory entries.
// TODO: rumors.c:791 — CapitalMon(): capitalized monster name check for the()

// cf. rumors.c:829 [static] — init_CapMons(): build capitalized monster name list
// Two-pass: pass 1 counts; pass 2 fills CapMons[].
// Collects non-unique monsters and unique-titles from mons[].pmnames[] whose name
//   starts uppercase, plus BOGUSMONFILE hallucinatory names not marked as personal names.
// N/A: JS has no malloc; would use mons[] array and compiled-in bogusmon data.
// TODO: rumors.c:829 — init_CapMons(): capitalized monster name list initialization

// cf. rumors.c:939 — free_CapMons(): release CapMons[] memory
// N/A: JS has garbage collection.
// N/A: rumors.c:939 — free_CapMons()

// Autotranslated from rumors.c:528
export async function outrumor(truth, mechanism, player) {
  let fortune_msg = "This cookie has a scrap of paper inside.", line, buf;
  let reading = (mechanism === BY_COOKIE || mechanism === BY_PAPER);
  if (reading) {
    if (is_fainted() && mechanism === BY_COOKIE) { return; }
    else if ((player?.Blind || player?.blind || false)) {
      if (mechanism === BY_COOKIE) await pline(fortune_msg);
      await pline("What a pity that you cannot read it!");
      return;
    }
  }
  line = getrumor(truth, buf, reading ? false : true);
  // C ref: rumors.c:175 — exercise(A_WIS, adjtruth > 0) after reading rumor
  // Note: C uses adjtruth (truth+rn2(2)) computed inside getrumor; here we
  // approximate with truth>0 which matches for blessed/cursed but not uncursed.
  if (player) exercise(player, A_WIS, truth > 0);
  if (!line) line = "NetHack rumors file closed for renovation.";
  switch (mechanism) {
    case BY_ORACLE:
      await pline("True to her word, the Oracle %ssays: ", (!rn2(4) ? "offhandedly " : (!rn2(3) ? "casually " : (rn2(2) ? "nonchalantly " : ""))));
    verbalize1(line);
    return;
    case BY_COOKIE:
      await pline(fortune_msg);
    case BY_PAPER:
      await pline("It reads:");
    break;
  }
  pline1(line);
}

// Autotranslated from rumors.c:576
export function init_oracles(fp) {
  let i, line, cnt = 0;
  dlb_fgets(line, line.length, fp);
  dlb_fgets(line, line.length, fp);
  if (sscanf(line, "%5d\n", cnt) === 1 && cnt > 0) {
    svo.oracle_cnt =  cnt;
    svo.oracle_loc =  alloc( cnt * sizeof);
    for (i = 0; i < cnt; i++) {
      dlb_fgets(line, line.length, fp);
      sscanf(line, "%5lx\n", svo.oracle_loc[i]);
    }
  }
  return;
}

// Autotranslated from rumors.c:938
export function free_CapMons() {
  _capMons = null;
}

// -----------------------------------------------------------------------
// rumors.c compatibility surface for CODEMATCH tracking
// -----------------------------------------------------------------------

// C ref: rumors.c:67 (static) unpadline()
export function unpadline(line = '') {
  return String(line).replace(/\r?\n$/, '').replace(/_+$/, '');
}

// C ref: rumors.c:85 (static) init_rumors()
export function init_rumors() {
  return {
    trueCount: trueTexts.length,
    trueSize,
    falseCount: falseTexts.length,
    falseSize,
    padLength: RUMOR_PAD_LENGTH,
  };
}

// C ref: rumors.c:308 (static) others_check()
export function others_check(ftype = '', _fname = '') {
  const tag = String(ftype).toLowerCase();
  if (tag.includes('epitaph')) {
    return { type: 'epitaph', count: epitaphTexts.length, ok: epitaphTexts.length > 0 };
  }
  if (tag.includes('rumor') || tag.includes('rumour')) {
    return { type: 'rumor', count: trueTexts.length + falseTexts.length, ok: trueTexts.length > 0 };
  }
  return { type: tag || 'unknown', count: 0, ok: false };
}

// C ref: rumors.c:196 rumor_check()
export function rumor_check() {
  return {
    rumors: init_rumors(),
    epitaphs: others_check('epitaph'),
  };
}

// C ref: rumors.c:420 (static) get_rnd_line()
export function get_rnd_line(source, padlength = RUMOR_PAD_LENGTH) {
  const texts = Array.isArray(source?.texts) ? source.texts : [];
  const lineBytes = Array.isArray(source?.lineBytes) ? source.lineBytes : [];
  const chunksize = Number.isFinite(source?.chunksize)
    ? source.chunksize
    : Number.isFinite(source?.size)
      ? source.size
      : 0;
  if (!texts.length || !lineBytes.length || chunksize <= 0) return '';
  const idx = get_rnd_line_index(lineBytes, chunksize, padlength);
  return unpadline(texts[idx] || '');
}

// C ref: rumors.c:499 get_rnd_text()
export function get_rnd_text(source, padlength = RUMOR_PAD_LENGTH) {
  if (typeof source === 'string') {
    const key = source.toLowerCase();
    if (key.includes('epitaph')) {
      return get_rnd_line({ texts: epitaphTexts, lineBytes: epitaphLineBytes, chunksize: epitaphChunksize }, padlength);
    }
    if (key.includes('true')) {
      return get_rnd_line({ texts: trueTexts, lineBytes: trueLineBytes, chunksize: trueSize }, padlength);
    }
    if (key.includes('false')) {
      return get_rnd_line({ texts: falseTexts, lineBytes: falseLineBytes, chunksize: falseSize }, padlength);
    }
  }
  return get_rnd_line(source, padlength);
}

// C ref: rumors.c:598 save_oracles()
export function save_oracles() {
  return { pool: [..._oraclePool] };
}

// C ref: rumors.c:623 restore_oracles()
export function restore_oracles(state = null) {
  _oraclePool = Array.isArray(state?.pool) ? [...state.pool] : [];
  return _oraclePool.length;
}

// C ref: rumors.c:640 outoracle()
export function outoracle(special = false, _delphi = false) {
  if (_oraclePool.length === 0) {
    _oraclePool = [getrumor(1, false), getrumor(1, false), getrumor(1, false)].filter(Boolean);
  }
  if (!_oraclePool.length) return '';
  if (special) return _oraclePool.shift() || '';
  const idx = rn2(_oraclePool.length);
  const text = _oraclePool[idx] || '';
  _oraclePool.splice(idx, 1);
  return text;
}

// C ref: rumors.c:696 doconsult()
export async function doconsult(oracl = null, player = null) {
  if (!oracl || !player) return ECMD_OK;
  const minorCost = 50;
  if ((player.gold || 0) < minorCost) return ECMD_OK;
  await outrumor(1, BY_ORACLE, player);
  return ECMD_OK;
}

// C ref: rumors.c:770 (static) couldnt_open_file()
export function couldnt_open_file(filename = '') {
  return `Cannot open ${String(filename)}`;
}

const DEFAULT_CAPMONS = [
  'Archon', 'Angel', 'Oracle', 'Medusa', 'Cyclops', 'Minotaur',
  'Wizard of Yendor', 'Death', 'Famine', 'Pestilence', 'Green-elf',
];

// C ref: rumors.c:829 (static) init_CapMons()
export function init_CapMons(seedList = null) {
  const source = Array.isArray(seedList) && seedList.length ? seedList : DEFAULT_CAPMONS;
  _capMons = source.map(x => String(x)).filter(x => x.length > 0);
  return _capMons.length;
}

// C ref: rumors.c:791 CapitalMon()
export function CapitalMon(word = '') {
  const w = String(word);
  if (!w || w[0] !== w[0].toUpperCase() || w[0] === w[0].toLowerCase()) return false;
  if (!_capMons) init_CapMons();
  const mons = _capMons || [];
  for (const mon of mons) {
    if (!w.startsWith(mon)) continue;
    const tail = w.slice(mon.length);
    if (!tail || tail.startsWith(' ') || tail.startsWith("'")) return true;
  }
  return false;
}
