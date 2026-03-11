// Browser adapter — wires display + input → gameLoop
// Entry point loaded by index.html as type="module"
import { Display } from './display.js';
import { Input } from './input.js';
import { GameState } from './game.js';
import { game as gameRef, setGame } from './gstate.js';
import { _setPriDeps } from './pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, g_at } from './mon.js';
import { _setHackDeps, setsee, unsee, seeoff, nomul, tele, amon, attmon } from './hack.js';
import { _setDo1Deps } from './do1.js';
import { newsym, newsym as newsym_fn } from './pri.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from './main.js';
import { rhack } from './do.js';
import { killed, rloc, mnexto, newcham, poisoned } from './mon.js';
import { dosearch, dorecover } from './do1.js';
import { docrt } from './pri.js';

async function startGame() {
  // Create display
  const container = document.getElementById('hack-container') || document.body;
  const display = new Display(container);
  const input = new Input();

  // Create game state
  const g = new GameState();
  g.display = display;
  g.input = input;
  setGame(g);

  // Wire up dependency injection to break circular imports

  // pri.js needs g_at and newsym and setsee
  _setPriDeps(
    (x, y, list) => {
      // g_at dispatches to correct list
      if (!list) return null;
      if ('gx' in list) return g_at_gen(x, y, list);
      if ('ox' in list) return g_at_obj(x, y, list);
      if ('mx' in list) return g_at_mon(x, y, list);
      return null;
    },
    newsym_fn,
    setsee
  );

  // mon.js needs various hack.js / do1.js / main.js functions
  _setMonDeps({
    setsee, tele, nomul, killed, rloc, newcham, mnexto,
    attmon, amon,
    buzz: (await import('./do1.js')).buzz,
    dosearch,
    losestr,
    ndaminc,
    docrt,
  });

  // do1.js needs nomul
  _setDo1Deps(nomul);

  // hack.js needs dodown, doup, docrt, poisoned
  _setHackDeps({ dodown, doup, docrt, poisoned });

  // main.js rhack hook
  setRhack(rhack);

  // Get seed from URL or use random
  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? parseInt(params.get('seed')) : (Date.now() & 0x7fffffff);

  document.title = 'Hack 1982';

  try {
    // Offer save restore if one exists
    if (localStorage.getItem('hack_save')) {
      display.moveCursor(1, 1);
      display.putString('Restore saved game? [yn] (n)');
      display.flush();
      const ans = await input.getKey();
      display.clearScreen();
      display.flush();
      if (ans === 'y' || ans === 'Y') {
        if (await dorecover()) {
          await gameLoop(seed, /*skipInit=*/true);
          return;
        }
      }
    }
    await gameLoop(seed);
  } catch (e) {
    if (e instanceof GameOver) {
      display.moveCursor(1, 1);
      display.putString(`Game over: ${e.reason}. Refresh to play again.`);
      display.flush();
    } else {
      console.error('Hack error:', e);
      display.moveCursor(1, 1);
      display.putString(`Error: ${e.message}`);
      display.flush();
    }
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
