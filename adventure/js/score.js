// score.js - Scoring for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (score.c)
// score(G, mode): mode < 0 = scoring, > 0 = quitting, 0 = died/won

import { speak, rspeak, setprm } from './misc.js';

export function score(G, mode) {
  G.SCORE = 0;
  G.MXSCOR = 0;

  // Tally treasures: must be in building (loc 3) and not broken.
  for (let i = 50; i <= G.MAXTRS; i++) {
    if (G.data.ptext[i] === 0) continue;
    let k = 12;
    if (i === G.CHEST) k = 14;
    if (i > G.CHEST) k = 16;
    if (G.PROP[i] >= 0) G.SCORE += 2;
    if (G.PLACE[i] === 3 && G.PROP[i] === 0) G.SCORE += k - 2;
    G.MXSCOR += k;
  }

  // Survival
  G.SCORE += (G.MAXDIE - G.NUMDIE) * 10;
  G.MXSCOR += G.MAXDIE * 10;

  // Not quitting
  if (mode === 0) G.SCORE += 4;
  G.MXSCOR += 4;

  // Getting into cave
  if (G.DFLAG !== 0) G.SCORE += 25;
  G.MXSCOR += 25;

  // Reaching closing
  if (G.CLOSNG) G.SCORE += 25;
  G.MXSCOR += 25;

  // Closed
  if (G.CLOSED) {
    if (G.BONUS === 0) G.SCORE += 10;
    if (G.BONUS === 135) G.SCORE += 25;
    if (G.BONUS === 134) G.SCORE += 30;
    if (G.BONUS === 133) G.SCORE += 45;
  }
  G.MXSCOR += 45;

  // Witt's End
  if (G.PLACE[G.MAGZIN] === 108) G.SCORE += 1;
  G.MXSCOR += 1;

  // Round off
  G.SCORE += 2;
  G.MXSCOR += 2;

  // Deductions
  for (let i = 1; i <= G.data.hntmax; i++) {
    if (G.HINTED[i]) G.SCORE -= G.data.hints[i][2];
  }
  if (G.NOVICE) G.SCORE -= 5;
  if (G.CLSHNT) G.SCORE -= 10;
  G.SCORE -= G.TRNLUZ;
  G.SCORE -= G.SAVED;

  // Return to score command if that's where we came from
  if (mode < 0) return;

  // Final report
  if (G.SCORE + G.TRNLUZ + 1 >= G.MXSCOR && G.TRNLUZ !== 0) rspeak(G, 242);
  if (G.SCORE + G.SAVED + 1 >= G.MXSCOR && G.SAVED !== 0) rspeak(G, 143);
  setprm(G, 1, G.SCORE, G.MXSCOR);
  setprm(G, 3, G.TURNS, G.TURNS);
  rspeak(G, 262);

  for (let i = 1; i <= G.data.clsses; i++) {
    if (G.data.cval[i] >= G.SCORE) {
      speak(G, G.data.ctext[i]);
      let spk = 264;
      if (i >= G.data.clsses) {
        spk = 265;
        rspeak(G, spk);
        return; // exit
      }
      const pts = G.data.cval[i] + 1 - G.SCORE;
      setprm(G, 1, pts, pts);
      spk = 263;
      rspeak(G, spk);
      return; // exit
    }
  }

  // Off the scale
  rspeak(G, 265);
}
