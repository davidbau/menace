// BASIC entry point — wires up Display, Canvas, Turtle, Interpreter, REPL.

import { LogoDisplay } from './display.js';
import { Turtle } from './turtle.js';
import { BasicInterpreter } from './interpreter.js';
import { BasicRepl } from './repl.js';

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
      if (c >= 97 && c <= 122) code = c - 96;
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
  const display = new LogoDisplay(document.getElementById('basic-container'));
  const canvas = document.getElementById('basic-canvas');
  const turtle = new Turtle(canvas);
  turtle.hideturtle(); // No turtle visible until HGR
  const interp = new BasicInterpreter(null, null, null);
  interp.setTurtle(turtle);
  const repl = new BasicRepl(display, interp);
  const getch = makeGetch();

  function sizeCanvas() {
    const pre = display.getPreElement();
    if (!pre) return;
    const container = pre.parentElement;
    if (!container) return;
    const preRect = pre.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    canvas.style.left = (preRect.left - contRect.left) + 'px';
    canvas.style.top = (preRect.top - contRect.top) + 'px';
    canvas.style.width = preRect.width + 'px';
    canvas.style.height = preRect.height + 'px';
  }

  requestAnimationFrame(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  });

  window._sizeBasicCanvas = sizeCanvas;
  window._basicDisplay = display;

  // Load file from ?file= URL parameter
  const params = new URLSearchParams(window.location.search);
  const file = params.get('file');
  if (file) {
    try {
      const fs = JSON.parse(localStorage.getItem('menace-fs') || '{}');
      const key = 'home/' + file.toLowerCase();
      const text = fs[key];
      if (text) interp._loadFromText(text);
    } catch (e) { /* ignore */ }
  }

  repl.start(getch);
});
