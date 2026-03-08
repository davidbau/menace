/**
 * Trace the AI decisions step by step for seed 42.
 */
import { runSessionWithAI } from './node_runner.mjs';

const ROWS = 24, COLS = 80;
function isPassable(ch) { return ch !== ' ' && ch !== '-' && ch !== '|'; }
function findChar(rows, ch) {
  for (let y = 1; y < ROWS - 1; y++) {
    const x = (rows[y] || '').indexOf(ch);
    if (x >= 0) return { y, x };
  }
  return null;
}

function bfsFirstStep(rows, start, isTarget) {
  const vis = new Uint8Array(ROWS * COLS);
  const par = new Int32Array(ROWS * COLS).fill(-1);
  const si  = start.y * COLS + start.x;
  vis[si] = 1; const q = [si]; let found = -1;
  const D4 = [[-1,0],[1,0],[0,-1],[0,1]];
  outer: while (q.length > 0) {
    const cur = q.shift();
    const cy = (cur / COLS) | 0, cx = cur % COLS;
    for (const [dy, dx] of D4) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS) continue;
      const ni = ny * COLS + nx;
      if (vis[ni]) continue; vis[ni] = 1; par[ni] = cur;
      if (isTarget(ny, nx)) { found = ni; break outer; }
      if (!isPassable(rows[ny]?.[nx] ?? ' ')) continue;
      q.push(ni);
    }
  }
  if (found === -1) return null;
  let cur = found;
  while (par[cur] !== si) { const p = par[cur]; if (p === -1 || p === si) break; cur = p; }
  return { y: (cur / COLS) | 0, x: cur % COLS, target: { y: (found/COLS)|0, x: found%COLS } };
}

let lastPos = null, stuck = 0, stuckDir = 0;
const visited = new Set(), blocked = new Set();
let step = 0, levelSteps = 0;

const keys = await runSessionWithAI(42, (screen, stepNum) => {
  if (stepNum > 80) return null;
  step++; levelSteps++;
  const topLine = screen[0] || '';
  if (topLine.includes('--More--')) { process.stderr.write(`[${stepNum}] --More--\n`); return ' '; }

  const player = findChar(screen, '@');
  if (!player) return 'h';

  if (lastPos && lastPos.y === player.y && lastPos.x === player.x) {
    stuck++;
    const dirs = {h:[0,-1],j:[1,0],k:[-1,0],l:[0,1],y:[-1,-1],u:[-1,1],b:[1,-1],n:[1,1]};
    const prevDir = 'hjklyubn'[stuckDir];
    const [pdy, pdx] = dirs[prevDir] || [0,0];
    blocked.add((player.y + pdy) * COLS + (player.x + pdx));
  } else { stuck = 0; }
  lastPos = { ...player };
  visited.add(player.y * COLS + player.x);

  let key, reason;

  if (stuck > 0) {
    if (stuck >= 3) { stuckDir = (stuckDir + 1) % 8; stuck = 0; }
    key = 'hjklyubn'[stuckDir];
    reason = `stuck=${stuck} dir=${key}`;
  } else {
    const s = bfsFirstStep(screen, player, (y, x) => {
      if (blocked.has(y * COLS + x)) return false;
      const ch = screen[y]?.[x] ?? ' ';
      if (ch === '#' && !visited.has(y * COLS + x)) return true;
      if (ch !== ' ') return false;
      if (y <= 0 || y >= ROWS - 1) return false;
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = y+dy, nx = x+dx;
        if (ny >= 1 && ny < ROWS-1 && nx >= 0 && nx < COLS && isPassable(screen[ny]?.[nx] ?? ' '))
          return true;
      }
      return false;
    });
    if (s) {
      const dy = s.y - player.y, dx = s.x - player.x;
      key = ({'-1,0':'k','1,0':'j','0,-1':'h','0,1':'l','-1,-1':'y','-1,1':'u','1,-1':'b','1,1':'n'})[`${dy},${dx}`] || 'h';
      reason = `BFS→(${s.target.y},${s.target.x}) step=(${s.y},${s.x}) key=${key}`;
    } else {
      key = levelSteps % 4 === 0 ? 's' : 'hjklyubn'[(stuckDir + 3) % 8];
      reason = `no-frontier key=${key}`;
    }
  }

  process.stderr.write(`[${stepNum}] pos=(${player.y},${player.x}) → ${key}  ${reason}\n`);
  return key;
});
