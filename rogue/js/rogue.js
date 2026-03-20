// Browser entry point for Rogue 3.6 JS port.
// Loaded by index.html as type="module".
import { Display } from './display.js';
import { Input } from './input.js';
import { initGame } from './main.js';

async function startGame() {
  const container = document.getElementById('rogue-container') || document.body;
  const display = new Display(container);
  const input = new Input();

  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? parseInt(params.get('seed')) : (Date.now() & 0x7fffffff);

  document.title = 'Rogue 3.6';

  try {
    await initGame(seed, display, input);
    // Game ended normally — return to the shell
    localStorage.setItem('shell_context', JSON.stringify({ app: 'rogue', user: 'rodney', rows: null }));
    window.location.href = '/shell/';
  } catch (e) {
    console.error('Rogue error:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
