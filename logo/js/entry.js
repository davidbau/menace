// Logo entry point — wires up Display, Canvas, Turtle, Interpreter, REPL.

import { LogoDisplay } from './display.js';
import { Turtle } from './turtle.js';
import { LogoInterpreter } from './interpreter.js';
import { LogoRepl } from './repl.js';

// Simple getch that reads keydown events as char codes
function makeGetch() {
  const queue = [];
  let resolver = null;
  function deliver(code) {
    if (resolver) { const r = resolver; resolver = null; r(code); }
    else queue.push(code);
  }
  document.addEventListener('keydown', e => {
    let code = null;
    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const c = e.key.toLowerCase().charCodeAt(0);
      if (c >= 97 && c <= 122) code = c - 96; // Ctrl-A…Ctrl-Z
    } else if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      if (e.key === 'Enter') code = 13;
      else if (e.key === 'Backspace') { code = 8; e.preventDefault(); }
      else if (e.key === 'Delete') code = 127;
      else if (e.key === 'Escape') code = 27;
      else if (e.key === 'ArrowUp') { code = 16; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { code = 14; e.preventDefault(); }
      else if (e.key.length === 1) code = e.key.charCodeAt(0);
    }
    if (code !== null) deliver(code);
  });
  return () => queue.length > 0
    ? Promise.resolve(queue.shift())
    : new Promise(r => { resolver = r; });
}

window.addEventListener('DOMContentLoaded', () => {
  const display = new LogoDisplay(document.getElementById('logo-container'));
  const canvas = document.getElementById('logo-canvas');
  const turtle = new Turtle(canvas);
  const interp = new LogoInterpreter(turtle, () => {});
  const repl = new LogoRepl(display, interp);
  const getch = makeGetch();

  // Size the canvas to match the terminal's pixel dimensions
  function sizeCanvas() {
    const pre = display.getPreElement();
    if (!pre) return;
    const rect = pre.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.style.left = rect.left + 'px';
    canvas.style.top = rect.top + 'px';
  }
  // Size after a frame so layout is computed
  requestAnimationFrame(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  });

  repl.start(getch);
});
