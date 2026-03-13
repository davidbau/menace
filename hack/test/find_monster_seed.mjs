/**
 * find_monster_seed.mjs — scan seeds to find ones where a target monster
 * starts adjacent (or within N steps) of the player on a given dlevel.
 *
 * Usage:
 *   node hack/test/find_monster_seed.mjs E          # floating eye, level 1
 *   node hack/test/find_monster_seed.mjs R          # rust monster
 *   node hack/test/find_monster_seed.mjs E,R,N,A    # any of these
 *   node hack/test/find_monster_seed.mjs P --dlevel 5  # purple worm at level 5
 *   node hack/test/find_monster_seed.mjs y --maxdist 3 # within 3 steps
 */

import { GameState } from '../js/game.js';
import { setGame } from '../js/gstate.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';
import { mon } from '../js/data.js';

// Minimal wiring
let _wired = false;
function wire() {
  if (_wired) return; _wired = true;
  _setPriDeps(
    (x, y, list) => {
      if (!list) return null;
      if ('gx' in list) return g_at_gen(x, y, list);
      if ('ox' in list) return g_at_obj(x, y, list);
      if ('mx' in list) return g_at_mon(x, y, list);
      return null;
    }, newsym, setsee
  );
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc, docrt });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

class Done extends Error {}

async function scanSeed(seed, targetDlevel, targetMlets, maxdist) {
  wire();
  const monSave = mon.map(t => t.map(m => m ? { ...m } : null));
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  setGame(g);

  let stepCount = 0;
  const maxSteps = 50 + targetDlevel * 20;

  input.getKey = async function () {
    stepCount++;
    if (stepCount > maxSteps) throw new Done();

    // Navigate: descend if not at target level
    if (g.dlevel < targetDlevel) {
      // Look for downstairs in view
      const lvl = g.levl;
      for (let x = 0; x < 80; x++) for (let y = 0; y < 22; y++) {
        if (lvl[x] && lvl[x][y] && lvl[x][y].scrsym === '>') {
          // Move toward it or press >
          const dx = Math.sign(x - g.u.ux), dy = Math.sign(y - g.u.uy);
          if (x === g.u.ux && y === g.u.uy) return '>';
          if (dx === 0) return dy > 0 ? 'j' : 'k';
          if (dy === 0) return dx > 0 ? 'l' : 'h';
          if (dx > 0 && dy > 0) return 'n';
          if (dx > 0 && dy < 0) return 'u';
          if (dx < 0 && dy > 0) return 'b';
          return 'y';
        }
      }
      return 'h'; // wander
    }

    // Check if target monster is within maxdist of player
    for (let m = g.fmon; m; m = m.nmon) {
      if (!targetMlets.includes(m.data.mlet)) continue;
      const dist = Math.max(Math.abs(m.mx - g.u.ux), Math.abs(m.my - g.u.uy));
      if (dist <= maxdist) {
        throw new Done();
      }
    }

    // Wander: try to explore
    return ['h', 'j', 'k', 'l', 'y', 'u', 'b', 'n'][stepCount % 8];
  };

  let found = null;
  try {
    await gameLoop(seed);
  } catch (e) {
    if (e instanceof Done || e instanceof GameOver) {
      // Check monsters after we stopped
      for (let m = g.fmon; m; m = m.nmon) {
        if (!targetMlets.includes(m.data.mlet)) continue;
        const dist = Math.max(Math.abs(m.mx - g.u.ux), Math.abs(m.my - g.u.uy));
        if (dist <= maxdist) {
          found = { mlet: m.data.mlet, mname: m.data.mname, mx: m.mx, my: m.my,
                    ux: g.u.ux, uy: g.u.uy, dist, dlevel: g.dlevel };
        }
      }
    } else throw e;
  } finally {
    for (let i = 0; i < mon.length; i++)
      for (let j = 0; j < mon[i].length; j++)
        if (monSave[i][j]) Object.assign(mon[i][j], monSave[i][j]);
  }
  return found;
}

// Parse args
const args = process.argv.slice(2);
const mletArg = args[0] || 'E';
const targetMlets = mletArg.split(',');
const dlevelIdx = args.indexOf('--dlevel');
const targetDlevel = dlevelIdx >= 0 ? parseInt(args[dlevelIdx + 1]) : 1;
const distIdx = args.indexOf('--maxdist');
const maxdist = distIdx >= 0 ? parseInt(args[distIdx + 1]) : 5;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 5;
const startIdx = args.indexOf('--start');
const startSeed = startIdx >= 0 ? parseInt(args[startIdx + 1]) : 1;

console.log(`Scanning for monsters: [${targetMlets.join(',')}] at dlevel=${targetDlevel} maxdist=${maxdist}`);
let found = 0;
for (let seed = startSeed; seed <= 50000 && found < limit; seed++) {
  const result = await scanSeed(seed, targetDlevel, targetMlets, maxdist);
  if (result) {
    console.log(`seed=${seed} dlevel=${result.dlevel} mlet=${result.mlet}(${result.mname}) at (${result.mx},${result.my}) player=(${result.ux},${result.uy}) dist=${result.dist}`);
    found++;
  }
}
if (found === 0) console.log('No seeds found in range.');
