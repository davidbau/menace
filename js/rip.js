import { formatkiller } from './end.js';
import { yyyymmdd } from './calendar.js';
import { putstr } from './windows.js';

// rip.js -- RIP/tombstone screen display
// cf. rip.c — genl_outrip(): render ASCII tombstone for game-over screen
//
// The tombstone art template (rip_txt[]) uses a 16-char-wide face between
// | markers. Lines:
//   NAME_LINE  6 — player name (up to 16 chars, centered)
//   GOLD_LINE  7 — gold amount ("NNN Au", centered)
//   DEATH_LINE 8..11 — death description word-wrapped to 16 chars/line
//   YEAR_LINE 12 — year of death (4-digit, centered)
// center() [static] writes text centered at column STONE_LINE_CENT (28).
//
// JS implementation: display.renderTombstone() at display.js:1135 is fully
//   implemented and matches the C logic (rip_txt template, center(), word-wrap
//   of death description). Called from nethack.js:1835 (done() path).
//   tombstone option flag stored in flags.tombstone (storage.js:556,597).
//   formatkiller() for death description is TODO in topten.js:13.

// cf. rip.c:75 [static] — center(line, text): center text on tombstone face
// Writes text into gr.rip[line] starting at STONE_LINE_CENT - (len+1)/2.
// JS equivalent: centerOnStone() local function inside display.renderTombstone()
//   at display.js:1153. Implemented.
// N/A as standalone: inlined into renderTombstone().

// cf. rip.c:85 — genl_outrip(tmpwin, how, when): render tombstone to a window
// Allocates copy of rip_txt[]; calls center() for name, gold, word-wrapped death
//   lines (splitting at spaces within STONE_LINE_LEN=16), and year;
//   writes all lines via putstr(tmpwin). Frees allocation after display.
// how: death method (passed to formatkiller()); when: timestamp for year extraction.
// JS equivalent: display.renderTombstone(name, gold, deathLines, year) at display.js:1135.
//   Fully implemented; caller in nethack.js:1835 handles word-wrap and year extraction.
//   Notable difference: JS receives pre-split deathLines array rather than calling
//   formatkiller() (JS formatkiller() is TODO in topten.js:13).
// ALIGNED: rip.c:85 — genl_outrip() ↔ display.renderTombstone() (display.js:1135)

// Autotranslated from rip.c:74 — center text on tombstone line
// Writes text centered at STONE_LINE_CENT in gr.rip[line]
export function center(line, text) {
  let start = STONE_LINE_CENT - ((text.length + 1) >> 1);
  let arr = gr.rip[line].split('');
  for (let i = 0; i < text.length; i++) {
    arr[start + i] = text[i];
  }
  gr.rip[line] = arr.join('');
}

// Autotranslated from rip.c:84 — render tombstone to a window
export async function genl_outrip(tmpwin, how, when) {
  let buf, x, line, year, cash;
  gr.rip = rip_txt.map(s => s);
  buf = svp.plname.slice(0, STONE_LINE_LEN);
  center(NAME_LINE, buf);
  cash = Math.max(gd.done_money, 0);
  if (cash > 999999999) cash = 999999999;
  buf = `${cash} Au`;
  center(GOLD_LINE, buf);
  formatkiller(buf, buf.length, how, false);
  // Word-wrap death description across DEATH_LINE..YEAR_LINE-1
  let dpx = buf;
  for (line = DEATH_LINE; line < YEAR_LINE; line++) {
    let i0 = dpx.length;
    if (i0 > STONE_LINE_LEN) {
      for (let i = STONE_LINE_LEN; i > 0 && i0 > STONE_LINE_LEN; --i) {
        if (dpx[i] === ' ') i0 = i;
      }
      if (i0 > STONE_LINE_LEN) i0 = STONE_LINE_LEN;
    }
    center(line, dpx.slice(0, i0));
    if (i0 < dpx.length && dpx[i0] === ' ') dpx = dpx.slice(i0 + 1);
    else dpx = dpx.slice(i0);
  }
  year = (Math.floor(yyyymmdd(when) / 10000) % 10000);
  buf = String(year).padStart(4);
  center(YEAR_LINE, buf);
  await putstr(tmpwin, 0, "");
  for (x = 0; x < gr.rip.length; x++) {
    await putstr(tmpwin, 0, gr.rip[x]);
  }
  await putstr(tmpwin, 0, "");
  await putstr(tmpwin, 0, "");
  gr.rip = 0;
}
