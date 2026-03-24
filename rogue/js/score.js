/**
 * score.js — Score tracking and display for Rogue 3.6 JS port.
 * Scores saved in localStorage under 'rogue-scores'.
 */

import { game } from './gstate.js';

const SCORE_KEY = 'rogue-scores';
const GAMEOVER_KEY = 'menace-gameover';
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
 * scoreLines(): return top-10 as array of plain-text strings, matching C output.
 */
export function scoreLines() {
  const scores = getScores();
  const lines = [
    'Top Ten Rogues',
    '  Rank      Gold  Level  Name',
    '  ----  --------  -----  --------------------',
  ];
  for (let i = 0; i < scores.length && i < MAX_SCORES; i++) {
    const s = scores[i];
    const rank  = String(i + 1).padStart(5);
    const gold  = String(s.gold).padStart(9);
    const level = String(s.level).padStart(6);
    const won   = s.won ? '*' : ' ';
    lines.push(`${rank}  ${gold}  ${level}  ${won}${s.name}`);
  }
  if (scores.length === 0) lines.push('  (no scores yet)');
  return lines;
}

/**
 * storeGameover(lines): save plain-text gameover lines to localStorage for the shell.
 * lines: array of strings.
 */
export function storeGameover(lines) {
  try {
    const rows = lines.map(text => ({ text, color: 7 })); // 7 = CLR_GRAY / white
    localStorage.setItem(GAMEOVER_KEY, JSON.stringify(rows));
  } catch (e) {}
}
