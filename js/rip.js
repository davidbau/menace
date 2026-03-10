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

// Autotranslated from rip.c:74
export function center(line, text) {
  let ip, op;
  ip = text;
  op = gr.rip[line][STONE_LINE_CENT - ((strlen(text) + 1) >> 1)];
  while ( ip) {
     op = ip++;
  }
}

// Autotranslated from rip.c:84
export async function genl_outrip(tmpwin, how, when) {
  let dp, dpx, buf, x, line, year, cash;
  gr.rip = dp = new Array(rip_txt.length).fill(null);
  for (x = 0; rip_txt[x]; ++x) {
    dp[x] = dupstr(rip_txt[x]);
  }
  dp[x] =  0;
  buf = svp.plname.slice(0, STONE_LINE_LEN);
  center(NAME_LINE, buf);
  cash = Math.max(gd.done_money, 0);
  if (cash > 999999999) cash = 999999999;
  buf = `${cash} Au`;
  center(GOLD_LINE, buf);
  formatkiller(buf, buf.length, how, false);
  for (line = DEATH_LINE, dpx = buf; line < YEAR_LINE; line++) {
    let tmpchar, i, i0 =  strlen(dpx);
    if (i0 > STONE_LINE_LEN) {
      for (i = STONE_LINE_LEN; (i > 0) && (i0 > STONE_LINE_LEN); --i) {
        if (dpx[i] === ' ') i0 = i;
      }
      if (!i) i0 = STONE_LINE_LEN;
    }
    tmpchar = dpx[i0];
    dpx[i0] = 0;
    center(line, dpx);
    if (tmpchar !== ' ') { dpx[i0] = tmpchar; dpx = dpx[i0]; }
    else {
      dpx = dpx[i0 + 1];
    }
  }
  year =  (Math.floor(yyyymmdd(when) / 10000) % 10000);
  buf = String(year).padStart(4);
  center(YEAR_LINE, buf);
  await putstr(tmpwin, 0, "");
  for ( dp; dp++; ) {
    await putstr(tmpwin, 0, dp);
  }
  await putstr(tmpwin, 0, "");
  await putstr(tmpwin, 0, "");
  for (x = 0; rip_txt[x]; x++) {
    (gr.rip[x], 0);
  }
  (gr.rip, 0);
  gr.rip = 0;
}
