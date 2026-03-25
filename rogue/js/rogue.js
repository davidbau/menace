// Browser entry point for Rogue 3.6 JS port.
// Loaded by index.html as type="module".
import { Terminal } from '../../js/terminal.js';
import { Input, Interrupted } from './input.js';
import { initGame } from './main.js';

async function startGame() {
  const container = document.getElementById('rogue-container') || document.body;
  const display = new Terminal(container);
  const input = new Input();

  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? parseInt(params.get('seed')) : (Date.now() & 0x7fffffff);

  document.title = 'Rogue 3.6';

  try {
    await initGame(seed, display, input);
    // Game ended normally — return to the shell
    display.captureForShell();
    localStorage.setItem('shell_context', JSON.stringify({ app: 'rogue', user: 'rodney', rows: null }));
    window.location.href = '/shell/';
  } catch (e) {
    if (e instanceof Interrupted) {
      // ^C — capture current screen and return to shell showing it
      const rows = [];
      for (let r = 0; r < display.rows; r++) {
        rows.push({ text: display.grid[r].map(c => c.ch).join('').trimEnd(), color: 7 });
      }
      while (rows.length > 0 && rows[rows.length - 1].text === '') rows.pop();
      display.captureForShell();
      localStorage.setItem('shell_context', JSON.stringify({ app: 'rogue', user: 'rodney', rows }));
      window.location.href = '/shell/';
    } else {
      console.error('Rogue error:', e);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
