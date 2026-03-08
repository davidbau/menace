/**
 * Debug: run AI for 50 steps on seed 1, then print screen and BFS info.
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
  vis[si] = 1;
  const q = [si];
  let found = -1;
  const D4 = [[-1,0],[1,0],[0,-1],[0,1]];

  outer: while (q.length > 0) {
    const cur = q.shift();
    const cy = (cur / COLS) | 0, cx = cur % COLS;
    for (const [dy, dx] of D4) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS) continue;
      const ni = ny * COLS + nx;
      if (vis[ni]) continue;
      vis[ni] = 1;
      par[ni] = cur;
      if (isTarget(ny, nx)) { found = ni; break outer; }
      const ch = rows[ny]?.[nx] ?? ' ';
      if (!isPassable(ch)) continue;
      q.push(ni);
    }
  }

  if (found === -1) return null;
  let cur = found;
  while (par[cur] !== si) {
    const p = par[cur];
    if (p === -1 || p === si) break;
    cur = p;
  }
  return { y: (cur / COLS) | 0, x: cur % COLS };
}

let targetStep = 100;
const SEED = parseInt(process.argv[2] || '1');
const keys = await runSessionWithAI(SEED, (screen, stepNum) => {
  if (stepNum >= targetStep) {
    const player = findChar(screen, '@');
    const stairs = findChar(screen, '>');
    process.stderr.write(`\n=== Step ${stepNum}, player=${JSON.stringify(player)}, stairs=${JSON.stringify(stairs)} ===\n`);
    screen.forEach((r, i) => process.stderr.write(`${String(i).padStart(2)}: ${r}\n`));

    if (player) {
      // Check frontier
      const frontier = [];
      for (let y = 1; y < ROWS-1; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((screen[y]?.[x] ?? ' ') !== ' ') continue;
          for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const ny = y+dy, nx = x+dx;
            if (ny >= 1 && ny < ROWS-1 && nx >= 0 && nx < COLS && isPassable(screen[ny]?.[nx] ?? ' ')) {
              frontier.push({y, x});
              break;
            }
          }
        }
      }
      process.stderr.write(`Frontier cells (${frontier.length}): ${JSON.stringify(frontier.slice(0,5))}\n`);

      const s = bfsFirstStep(screen, player, (y, x) => {
        if ((screen[y]?.[x] ?? ' ') !== ' ') return false;
        if (y <= 0 || y >= ROWS - 1) return false;
        for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ny = y+dy, nx = x+dx;
          if (ny >= 1 && ny < ROWS-1 && nx >= 0 && nx < COLS && isPassable(screen[ny]?.[nx] ?? ' '))
            return true;
        }
        return false;
      });
      process.stderr.write(`BFS frontier step: ${JSON.stringify(s)}\n`);
    }
    return null;
  }

  // Simple exploratory AI
  const topLine = screen[0] || '';
  if (topLine.includes('--More--')) return ' ';
  if (/really quit/i.test(topLine)) return 'y';
  const player = findChar(screen, '@');
  if (!player) return 'h';
  const stairs = findChar(screen, '>');
  if (screen[player.y]?.[player.x] === '>') return '>';
  const s = bfsFirstStep(screen, player, (y, x) => {
    if ((screen[y]?.[x] ?? ' ') !== ' ') return false;
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
    return ({'-1,0':'k','1,0':'j','0,-1':'h','0,1':'l','-1,-1':'y','-1,1':'u','1,-1':'b','1,1':'n'})[`${dy},${dx}`] || 'h';
  }
  return 'hjklyubn'[stepNum % 8];
});
