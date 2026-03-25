---
name: game-porting
description: Methodology for porting a classic C terminal game (curses-based or stdio) to JavaScript with C parity testing. Covers the full pipeline from C harness through JS translation to session-based parity verification.
---

# Game Porting Methodology

## When To Use

- Starting a new game port (Larn, Robots, Tetris, Adventure, etc.)
- Setting up a C harness for parity testing
- Designing the JS architecture for a ported game
- Debugging parity failures in a newly ported game

## The Pipeline

Every game port follows the same proven pipeline:

```
C source → C harness → recorded sessions → JS translation → parity testing
```

### Phase 1: C Harness (~1 day)

Build a modified C binary that:
1. **Injects keystrokes** from a JSON session file instead of reading keyboard
2. **Logs RNG calls** with caller tags for comparison
3. **Captures screen state** after each keystroke (24×80 character grid)
4. **Outputs JSON** with steps: `[{key, screen, rng, cursor}]`

For curses-based games (Rogue, Hack, Larn, Robots, Tetris):
- Create `hack_curses.c` — fake curses implementation that writes to
  in-memory arrays instead of a terminal
- Create `harness_main.c` — replaces `main()`, reads keys from JSON,
  calls the game loop
- Create `rng_log.c` — wraps `rand()`/`rn2()` to log every call

For stdio games (Adventure):
- Replace `stdin` with key injection
- Capture `stdout` output per input line

Key files to create:
```
<game>-c/patched/          — patched C source
<game>-c/patched/Makefile  — builds the harness binary
<game>-c/patched/run_session.py — CLI: --seed N --keys "..." --out file.json
```

### Phase 2: Record Sessions (~0.5 day)

Record a diverse set of sessions covering major code paths:
```bash
python3 <game>-c/patched/run_session.py --seed 42 --keys "..." --out sessions/seed42.json
```

Start with 5-10 sessions covering:
- Normal gameplay (movement, combat, items)
- Edge cases (death, save/restore, special features)
- Wizard mode if available (for testing rare code paths)

### Phase 3: JS Translation (~2-4 days)

Translate the C game logic to JavaScript. Architecture:

```
<game>/
├── js/
│   ├── main.js        — game loop, initialization
│   ├── curses.js      — curses adapter (calls Terminal API)
│   ├── game.js        — game state object
│   └── ...            — other game modules
├── test/
│   ├── sessions/      — recorded session fixtures
│   ├── node_runner.mjs — headless session runner
│   └── replay_test.mjs — parity test runner
└── index.html         — browser entry point
```

The curses adapter pattern (proven in Rogue and Hack):
- Game code calls curses functions: `mvaddch`, `move`, `refresh`, `getch`
- `curses.js` translates these to Terminal API: `setCell`, `setCursor`, `flush`
- Terminal handles rendering (DOM or headless)

### Phase 4: Parity Testing (~1-2 days)

Run recorded sessions against the JS implementation:
```bash
node <game>/test/replay_test.mjs --all
```

Each step compares:
- **Screen**: 24×80 character grid (≥98% match required)
- **RNG**: random number sequence (100% match required)
- **Cursor**: position after each step
- **Step count**: JS must produce same number of steps as C

Fix divergences using the same approach as NetHack parity:
1. Find first divergence step
2. Compare C vs JS at that step
3. Fix the JS code to match C behavior
4. Re-run, repeat

### Phase 5: Browser Integration (~0.5 day)

Wire the game into the shell and browser:
```javascript
// shell/commands.js
case '<game>': {
    const { Game } = await import('../../<game>/js/main.js');
    const game = new Game(shell.display, () => shell.readKey());
    await game.run();
    break;
}
```

The game uses the shared Terminal for display (inherited from Shell).

## Curses Adapter Patterns

### Window management (Rogue-style)

Rogue uses curses windows (`cw`, `hw`, `mw`). The adapter maintains
character arrays per window and composites them on `draw()`:

```javascript
export function draw(win) {
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            display.putChar(c + 1, r + 1, win[r][c], win_attr[r][c]);
    display.moveCursor(cursor.x + 1, cursor.y + 1);
    display.flush();
}
```

### Direct curses (Hack-style)

Hack calls display methods directly without a curses layer:
```javascript
display.moveCursor(x, y);  // 1-based
display.putString(str);     // at cursor
display.clearToEol();
display.flush();
```

## RNG Seeding

Each game has its own RNG. Common patterns:
- **Rogue**: `rand()` (glibc LCG), seeded via `srand(seed)`
- **Hack**: same glibc `rand()` pattern
- **NetHack**: ISAAC64 CSPRNG, seeded from `/dev/urandom`

The C harness must seed deterministically (via env var or command line)
for reproducible sessions.

## Session Format

Standard session JSON:
```json
{
    "seed": 42,
    "wizard": true,
    "steps": [
        {"key": "h", "screen": ["...24 lines..."], "rng": [1, 5, 3], "cursor": [5, 10]}
    ]
}
```

## Testing Gates

A game port is complete when:
- [ ] All recorded sessions pass parity (screen ≥98%, RNG 100%)
- [ ] Game plays correctly in browser
- [ ] Shell command works (`<game>` at `$` prompt)
- [ ] Save/restore works (if the game supports it)
- [ ] No per-game Display class (uses shared Terminal)
