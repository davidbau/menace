# Plan: Hack 1982 JS Port — `/hack` within Mazes of Menace

## Context

Jay Fenlason's original 1982 Hack is the ancestor of NetHack: ~6,200 lines of C across 10 files,
no roles, no Amulet of Yendor, no quest — just "escape the dungeon." We port it to the browser
using the same methodology as the NetHack port: one JS file per C file, C field names preserved,
async game loop, session-based parity testing, and a patched C harness for reference session capture.

The result lives at `mazesofmenace.net/hack` — the 1982 prototype next to its 40-year descendant.

---

## Directory Structure

```
hack/
├── index.html                  Browser entry point
├── PLAN.md                     This document
├── CODEMATCH.md                C↔JS function ledger (every function tracked)
├── DESIGN.md                   Architecture, state structure, decisions
├── LORE.md                     Hard-won porting lessons
├── hack-c/
│   ├── upstream/               Verbatim fenlason-hack source (read-only reference)
│   └── patched/                Modified for modern build + seed control + session capture
│       ├── Makefile
│       ├── hack_harness.c      Harness: input injection, screen capture, JSON output
│       ├── rng_log.c           RNG instrumentation
│       ├── run_session.py      Run patched hack with seed+keystrokes → session JSON
│       ├── rerecord.py         Re-run sessions from regen metadata
│       └── *.c / *.h           Patched source files
├── test/
│   ├── sessions/               Reference JSON sessions captured from C
│   ├── replay_test.mjs         Session replay comparator (JS vs C)
│   └── pes_report.mjs          Parity Evidence Summary table
└── js/
    ├── const.js                Constants from hack.h / hackfoo.h (leaf)
    ├── data.js                 Monster table, item arrays, strings (leaf)
    ├── gstate.js               Global state holder
    ├── game.js                 GameState class, map cell factory
    ├── rng.js                  rnd.c → rn1/rn2/rnd/d (seeded, logged)
    ├── mklev.js                mklev.c → level generator
    ├── lev.js                  hack.lev.c → savelev/getlev/mkobj
    ├── pri.js                  hack.pri.c → display/message functions
    ├── mon.js                  hack.mon.c → monster AI, combat, makemon
    ├── do.js                   hack.do.c → rhack command dispatcher
    ├── do1.js                  hack.do1.c → buzz/bhit/dosearch/dosave/ringoff
    ├── hack.js                 hack.c → domove/parse/doname/tele/unsee
    ├── main.js                 hack.main.c → game loop, shufl, losestr, glo
    ├── display.js              Browser display (80×22 terminal)
    ├── input.js                Async keyboard input queue
    └── browser_main.js         Browser adapter: wires display + input → main loop
```

---

## Phases and Gates

### Phase 0 — C Reference Harness
**Goal:** Produce reproducible JSON sessions from the original C code.
**Gate:** `python3 run_session.py --seed 42 --keys ":hhhljj.ss" --out seed42.json` produces a
valid, deterministic JSON session. Running twice with same args produces identical output.

### Phase 1 — Browser Shell & Display
**Goal:** 80×22 terminal in the browser; keyboard input working.
**Gate:** Open `hack/index.html` in browser; see blank 80×22 terminal; pressing keys shows them
echoed. `const.js` and `data.js` import without errors; all 56 monsters accessible.

### Phase 2 — Level Generation
**Goal:** JS `mklev.js` produces levels matching C reference output for given seeds.
**Gate:** 5 reference sessions all produce matching level layouts (typgrid match).

### Phase 3 — Core Game Engine
**Goal:** All 9 C files ported; game is playable start to death.
**Gate:** Can start a new game, move around, fight monsters, pick up gold, descend stairs, die.

### Phase 4 — Session Parity
**Goal:** JS sessions match C reference sessions step-by-step.
**Gate:** 10 reference sessions all replay with 100% screen match and ≥95% RNG match.

### Phase 5 — Polish & Deploy
**Goal:** Full game experience; live at `/hack`.
**Gate:** A full game session from start to death/escape is satisfying.
