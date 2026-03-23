// C ref: hack.main.c — game loop, initialization, shufl, losestr, glo
import { HP, STR, DHS, GOLD, AC, HPM, ULV, UEX } from './const.js';
import { rn1, rn2, rnd, d, seedRng, logEvent } from './rng.js';
import { game, GameOver } from './gstate.js';
import { makeObj } from './game.js';
import { pline, bot, nscr, cls, panic, losehp, pru } from './pri.js';
import { setsee, unsee, seeoff, domove, movecm, tele, parse, nomul, doname } from './hack.js';
import { movemon, makemon, rloc, delmon, mnexto } from './mon.js';
import { dosave, dosearch } from './do1.js';
import { mklev } from './lev.js';
import { savelev, getlev } from './lev.js';
import { docrt } from './pri.js';
import { wannam, potcol, rinnam, scrnam, scrtyp } from './data.js';

// C ref: ndaminc() — recalculate damage increment from strength
export function ndaminc() {
  const str = game.u.ustr;
  let inc = 0;
  if (str < 6) inc = -2;
  else if (str < 8) inc = -1;
  else if (str < 14) inc = 0;
  else if (str < 16) inc = 1;
  else if (str < 17) inc = 1;
  else if (str < 18) inc = 2;
  else if (str < 19) inc = 3;  // 18
  else if (str < 103) inc = 3 + Math.floor((str - 18) / 10);  // 18/xx
  else inc = 7;
  game.u.udaminc = inc;
}

// C ref: shufl(base,num) — Fisher-Yates shuffle of an array
export function shufl(base, num) {
  for (let curnum = num - 1; curnum > 0; curnum--) {
    const idx = rn2(curnum);
    const tmp = base[idx];
    base[idx] = base[curnum];
    base[curnum] = tmp;
  }
}

// C ref: losestr(num) — reduce strength
export function losestr(num) {
  if (game.u.ustr > 18) {
    game.u.ustr -= 15 * num;
    if (game.u.ustr < 18) game.u.ustr = 17;
  } else if (game.u.ustr > 3) {
    game.u.ustr -= num;
    if (game.u.ustr < 3) game.u.ustr = 3;
  } else return;
  ndaminc();
  game.flags.botl |= STR;
}

// C ref: glo(foo) — set lock filename suffix
export function glo(foo) {
  const dot = game.lock.indexOf('.');
  if (dot >= 0) game.lock = game.lock.slice(0, dot);
  game.lock = game.lock + '.' + foo;
}


// ===== Score storage for Hack =====

const HACK_SCORE_KEY = 'hack-scores';
const GAMEOVER_KEY = 'menace-gameover';
const MAX_HACK_SCORES = 10;

function getHackScores() {
  try { return JSON.parse(localStorage.getItem(HACK_SCORE_KEY) || '[]'); } catch (e) { return []; }
}

function addHackScore(name, points, dlevel, reason, killer) {
  const scores = getHackScores();
  scores.push({ name, points, dlevel, reason, killer, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.points - a.points);
  if (scores.length > MAX_HACK_SCORES) scores.length = MAX_HACK_SCORES;
  try { localStorage.setItem(HACK_SCORE_KEY, JSON.stringify(scores)); } catch (e) {}
}

function hackScoreLines(scores) {
  const lines = ['Number  Points   Name'];
  for (let i = 0; i < scores.length && i < MAX_HACK_SCORES; i++) {
    const s = scores[i];
    const num    = String(i + 1).padStart(2);
    const points = String(s.points).padStart(6);
    let   desc;
    if (s.reason === 'escaped') {
      desc = 'escaped the dungeon';
    } else if (s.reason === 'quit') {
      desc = `quit on dungeon level ${s.dlevel}.`;
    } else {
      const vowels = 'aeiouAEIOU';
      const art = vowels.includes((s.killer || '')[0]) ? 'an' : 'a';
      desc = `was killed on dungeon level ${s.dlevel} by ${art} ${s.killer || 'unknown'}.`;
    }
    lines.push(`${num}    ${points}  ${s.name} ${desc}`);
  }
  if (scores.length === 0) lines.push('  (no scores yet)');
  return lines;
}

// C ref: done(str) — game over (death or escape)
// Shows the Hack end-game screen, stores lines for the shell, then throws GameOver.
export async function done(reason) {
  const uname = game.uname || 'rodney';
  const disp  = game.display;
  const input = game.input;

  // Calculate escape experience bonus (C: done('escaped') path)
  let urexp = game.u.urexp;
  if (reason === 'escaped') {
    urexp += 150;
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
      if (otmp.olet === '*') urexp += otmp.quan * 10 * (1 + Math.floor(Math.random() * 12));
      else if (otmp.olet === '"') urexp += 5000;
    }
  }

  // Determine killer string
  const killerStr = game.killer || reason;

  // Record score
  addHackScore(uname, urexp, game.dlevel, reason, killerStr);
  const scores = getHackScores();

  // Build plain-text lines (matching C done() output)
  const lines = [];
  lines.push(`Goodbye ${uname}...`);
  lines.push('');
  if (reason === 'escaped') {
    lines.push(`You escaped from the dungeon with ${urexp} points.`);
  } else {
    lines.push(`You ${reason} on dungeon level ${game.dlevel} with ${urexp} points.`);
  }
  lines.push(`and ${game.u.ugold} pieces of gold, after ${game.moves} moves.`);
  lines.push(`You were level ${game.u.ulevel} with a maximum of ${game.u.uhpmax} hit points when you ${reason}.`);
  lines.push('');
  for (const sl of hackScoreLines(scores)) lines.push(sl);

  // Show on screen and wait for keypress (browser only)
  if (disp && typeof disp.clearScreen === 'function') {
    disp.clearScreen();
    for (let i = 0; i < lines.length; i++) {
      disp.moveCursor(1, i + 1);
      disp.putString(lines[i]);
    }
    disp.moveCursor(1, lines.length + 2);
    disp.putString('--Press space to continue--');
    disp.flush();
    if (input) {
      let ch;
      do { ch = await input.getKey(); } while (ch !== ' ');
    }
  }

  // Store for shell scrollback (browser only)
  if (typeof localStorage !== 'undefined') {
    try {
      const rows = lines.map(text => ({ text, color: 7 }));
      localStorage.setItem(GAMEOVER_KEY, JSON.stringify(rows));
    } catch (e) {}
  }

  throw new GameOver(reason);
}

// GameOver is defined in gstate.js to avoid circular imports; re-export for callers.
export { GameOver };

// C ref: dodown() — descend stairs
export async function dodown() {
  savelev();
  glo(game.dlevel);
  game.dlevel++;
  glo(game.dlevel);
  if (!game.savedLevels[game.dlevel]) mklev();
  const snap = game.savedLevels[game.dlevel];
  getlev(snap);
  game.u.ux = game.xupstair; game.u.uy = game.yupstair;
}

// C ref: doup() — ascend stairs
export async function doup() {
  savelev();
  glo(game.dlevel);
  game.dlevel--;
  if (game.dlevel < 1) {
    await done('escaped');
    return;
  }
  glo(game.dlevel);
  const snap = game.savedLevels[game.dlevel];
  if (!snap) mklev();
  getlev(game.savedLevels[game.dlevel]);
  game.u.ux = game.xdnstair; game.u.uy = game.ydnstair;
}

// C ref: done1() — quit handler (^C / Q key)
// C: pline("Really quit?"); fflush; if(getchar()!='y') return; done(QUIT)
export async function done1() {
  await pline('Really quit?');
  const ans = await game.input.getKey();  // harness captures screen with "Really quit?" visible
  if (ans !== 'y') { game.flags.move = game.multi = 0; return; }
  await done('quit');
}

// C ref: rhack(cmd) — execute one command
// do.js provides _rhack_fn which handles all commands; this is the dispatch stub.
async function rhack(cmd) {
  if (_rhack_fn) return _rhack_fn(cmd);
}

let _rhack_fn = null;
export function setRhack(fn) { _rhack_fn = fn; }

// C ref: main() → gameLoop() — the main game loop
// skipInit=true: state already restored by dorecover(), skip initialization
export async function gameLoop(seed, skipInit = false) {
  if (!skipInit) {
    // Initialize RNG
    seedRng(seed || Date.now() & 0x7fffffff);
    // Save initial seed — mklev re-seeds with this (C: srand(getpid()) overridden to game seed)
    game.initialSeed = game.rngSeed;

    // C ref: hack.main.c initialization order — maze first, then shuffles
    game.flags.maze = rn1(5, 25);

    // Initialize shuffled name arrays (copies)
    game.wannam  = [...wannam];  shufl(game.wannam, game.wannam.length);
    game.potcol  = [...potcol];  shufl(game.potcol, game.potcol.length);
    game.rinnam  = [...rinnam];  shufl(game.rinnam, game.rinnam.length);
    game.scrnam  = [...scrnam];  shufl(game.scrnam, game.scrnam.length);

    // Starting inventory: 2 food rations, short sword, leather armor
    const food = makeObj();
    food.olet = '%'; food.otyp = 0; food.quan = 2; food.known = 1;
    const sword = makeObj();
    sword.olet = ')'; sword.otyp = 4; sword.quan = 1; sword.spe = sword.known = 1;
    const armor = makeObj();
    armor.olet = '['; armor.otyp = 3; armor.quan = 1; armor.spe = armor.known = 1;
    armor.cursed = armor.minus = false; sword.cursed = sword.minus = false;

    food.nobj = sword; sword.nobj = armor; armor.nobj = null;
    game.invent = food;
    game.uwep = sword;
    game.uarm = armor;

    game.u.uac = 6;
    game.u.ulevel = 1;
    game.u.uhunger = 900;
    game.u.uhpmax = game.u.uhp = 12;
    if (!rn2(20)) game.u.ustrmax = game.u.ustr = rn1(20, 14);
    else game.u.ustrmax = game.u.ustr = 16;
    ndaminc();
    game.flags.move = true;
    game.flags.one = true;

    // Generate first level
    glo(1);
    mklev();
    getlev(game.savedLevels[game.dlevel]);
    game.u.ux = game.xupstair;
    game.u.uy = game.yupstair;

    await cls(); setsee();
    game.flags.botl = 1;
  }

  // Main game loop
  for (;;) {
    if (game.flags.move) {
      // Monster turn
      logEvent(`turn[moves=${game.moves}]`);
      if (!game.u.ufast || game.moves % 2 === 0) {
        if (game.fmon) await movemon();
        if (!rn2(60)) { makemon(null); if (game.fmon) { game.fmon.mx = 0; game.fmon.my = 0; rloc(game.fmon); } }
      }
      // Timed effects
      if (game.u.ufast && !--game.u.ufast) await pline('You slow down.');
      if (game.u.uconfused && !--game.u.uconfused) await pline('You feel less confused now.');
      if (game.u.ublind && !--game.u.ublind) { await pline('You can see again.'); setsee(); }
      if (game.u.uinvis && !--game.u.uinvis) { pru(); await pline('You are no longer invisible.'); }

      game.moves++;
      game.u.uhunger--;
      if ((game.u.uregen || game.u.ufeed) && game.moves % 2) game.u.uhunger--;

      // Death check
      if (game.u.uhp < 1) { await pline('You die...'); await done('died'); }

      // HP regeneration
      if (game.u.uhp < game.u.uhpmax) {
        if (game.u.ulevel > 9) {
          if (game.u.uregen || !(game.moves % 3)) {
            game.flags.botl |= HP;
            game.u.uhp += rnd(game.u.ulevel - 9);
            if (game.u.uhp > game.u.uhpmax) game.u.uhp = game.u.uhpmax;
          }
        } else if (game.u.uregen || !(game.moves % (22 - game.u.ulevel * 2))) {
          game.flags.botl |= HP;
          game.u.uhp++;
        }
      }

      // Teleportitis
      if (game.u.utel && !rn2(85)) tele();
      // Auto-search
      if (game.u.usearch) await dosearch();

      // Hunger
      if (game.u.uhunger < 151 && game.u.uhs === 0) {
        await pline('You are beginning to feel hungry.'); game.u.uhs = 1; game.flags.botl |= DHS;
      } else if (game.u.uhunger < 51 && game.u.uhs === 1) {
        await pline('You are beginning to feel weak.'); game.u.uhs = 2; losestr(1); game.flags.botl |= DHS;
      } else if (game.u.uhunger < 1) {
        await pline('You faint from lack of food.');
        if (game.u.uhs !== 3) { game.u.uhs = 3; game.flags.botl |= DHS; }
        nomul(-20); game.u.uhunger = rn1(4, 22);
      }
    }

    game.flags.move = true;
    // C: flags.mdone is NOT reset here — only parse() resets it (after reading next key).
    // This means mdone persists across run-mode iterations, matching C behavior:
    // the last run step (hitting a wall) sees mdone=true from the previous step → pru() draws '@'.

    if (!game.multi) {
      if (game.flags.dscr) nscr();
      if (game.flags.botl) bot();
      if (game.flags.mv) game.flags.mv = false;
      await rhack(await parse());
    } else if (game.multi < 0) {
      if (!++game.multi) await pline('You can move again.');
    } else {
      if (game.flags.mv) {
        if (game.multi < 80) --game.multi;
        await domove();
      } else {
        --game.multi;
        await rhack(game.save_cm);
      }
    }
  }
}
