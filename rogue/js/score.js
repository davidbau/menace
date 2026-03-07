/**
 * score.js — Score tracking and display for Rogue 3.6 JS port.
 * Scores saved in localStorage under 'rogue-scores'.
 */

import { game } from './gstate.js';
import { wclear, mvwaddstr, draw } from './curses.js';
import { LINES } from './const.js';

const SCORE_KEY = 'rogue-scores';
const MAX_SCORES = 10;

function getScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * addScore(gold, level, won): record the player's final score.
 * Called from death() and total_winner().
 */
export function addScore(gold, level, won) {
  const g = game();
  const scores = getScores();
  scores.push({
    name:  g.whoami || 'rogue',
    gold:  gold,
    level: level,
    won:   won,
    date:  new Date().toLocaleDateString(),
  });
  scores.sort((a, b) => b.gold - a.gold);
  if (scores.length > MAX_SCORES) scores.length = MAX_SCORES;
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch (e) {}
}

/**
 * showScores(): display the top-10 score list on cw, wait for space.
 */
export async function showScores() {
  const g = game();
  const { wait_for } = await import('./io.js');
  const scores = getScores();

  wclear(g.cw);
  mvwaddstr(g.cw, 0, 0, 'Top Ten Rogues');
  mvwaddstr(g.cw, 1, 0, '  Rank      Gold  Level  Name');
  mvwaddstr(g.cw, 2, 0, '  ----  --------  -----  --------------------');

  for (let i = 0; i < scores.length && i < MAX_SCORES; i++) {
    const s = scores[i];
    const rank  = String(i + 1).padStart(5);
    const gold  = String(s.gold).padStart(9);
    const level = String(s.level).padStart(6);
    const won   = s.won ? '*' : ' ';
    mvwaddstr(g.cw, 3 + i, 0, `${rank}  ${gold}  ${level}  ${won}${s.name}`);
  }

  if (scores.length === 0) {
    mvwaddstr(g.cw, 3, 2, '(no scores yet)');
  }

  mvwaddstr(g.cw, LINES - 1, 0, '--Press space to continue--');
  draw(g.cw);
  await wait_for(' ');
  wclear(g.cw);
  draw(g.cw);
}
