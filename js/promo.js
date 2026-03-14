// promo.js -- Attract-mode promotional display.
// Shown when the user declines to play again after game over.
// Cycles through scenes and a high-score table until any key is pressed.

import { CLR_RED, CLR_YELLOW, CLR_BRIGHT_GREEN, CLR_WHITE, CLR_GRAY, CLR_ORANGE } from './display.js';
import { loadScores, formatTopTenHeader, formatTopTenEntry } from './topten.js';
import { VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL } from './const.js';
import { runShell } from '../shell/shell.js';

// NETHACK logo — hand-crafted 5×5 pixel-art letterforms
const LETTERS = {
    N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
    E: ['█████', '█    ', '████ ', '█    ', '█████'],
    T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
    H: ['█   █', '█   █', '█████', '█   █', '█   █'],
    A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
    C: [' ████', '█    ', '█    ', '█    ', ' ████'],
    K: ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
};

// Draw the "NETHACK" logo starting at the given row, centered on 80 cols.
function drawLogo(display, startRow, color) {
    const word = 'NETHACK';
    const letterWidth = 5;
    const gap = 2;
    const totalWidth = word.length * letterWidth + (word.length - 1) * gap;
    const startCol = Math.floor((80 - totalWidth) / 2);
    for (let li = 0; li < word.length; li++) {
        const rows = LETTERS[word[li]];
        const colOff = startCol + li * (letterWidth + gap);
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < letterWidth; c++) {
                if (rows[r][c] === '█') {
                    display.setCell(colOff + c, startRow + r, '█', color);
                }
            }
        }
    }
}

// Scene 1: red dragon in fire-breathing stance with outstretched wings.
//
// Wings are drawn as two diagonal bands sweeping down from the upper corners
// toward the body. At row 17 both bands meet a horizontal body floor.
// Rows 18-21 form the neck and head: open jaws, two glowing eyes, and a
// column of fire breathing to the right.
//
// Layout (display rows 10-21, cols 0-79):
//
//   row 10  \________\                        /________/
//   row 11   \________\                      /________/
//   ...         (wings narrow toward center)
//   row 17          \________\____________/________/   <- body floor
//   row 18                    \            /
//   row 19                    \ (o)    (o)/   ~~~~~~~~~~>
//   row 20                     \vvvvvvvvv/    ~~~~~~~~~>
//   row 21                      \_______/     ~~~~~~~~>
//
function drawDragonScene(display) {
    const R = CLR_RED, Y = CLR_YELLOW, O = CLR_ORANGE, W = CLR_WHITE;

    // ── Wings (rows 10-17) ───────────────────────────────────────────────
    // Each wing is a 10-char-wide diagonal band: \________\ and /________/
    // The band shifts one column right per row as it descends.
    for (let i = 0; i <= 7; i++) {
        const row = 10 + i;
        const lo = i,      li = 10 + i;   // left outer / inner col
        const ri = 69 - i, ro = 79 - i;   // right inner / outer col

        display.setCell(lo, row, '\\', R);
        for (let c = lo + 1; c < li; c++) display.setCell(c, row, '_', R);
        display.setCell(li, row, '\\', R);

        display.setCell(ri, row, '/', R);
        for (let c = ri + 1; c < ro; c++) display.setCell(c, row, '_', R);
        display.setCell(ro, row, '/', R);
    }

    // ── Body floor (row 17) ──────────────────────────────────────────────
    // Underscores bridge the gap between the two inner wing edges,
    // completing the silhouette of the torso.
    for (let c = 18; c <= 61; c++) display.setCell(c, 17, '_', R);

    // ── Neck (row 18) ────────────────────────────────────────────────────
    display.setCell(17, 18, '\\', R);
    display.setCell(62, 18, '/', R);

    // ── Head: upper jaw with eyes (row 19) ───────────────────────────────
    display.setCell(18, 19, '\\', R);
    // left eye
    display.setCell(22, 19, '(', R);
    display.setCell(23, 19, 'o', W);
    display.setCell(24, 19, ')', R);
    // right eye
    display.setCell(55, 19, '(', R);
    display.setCell(56, 19, 'o', W);
    display.setCell(57, 19, ')', R);
    display.setCell(61, 19, '/', R);

    // ── Head: open jaws / teeth (row 20) ─────────────────────────────────
    display.setCell(20, 20, '\\', R);
    for (let c = 21; c <= 58; c++) display.setCell(c, 20, 'v', R);
    display.setCell(59, 20, '/', R);

    // ── Head: lower jaw / chin (row 21) ──────────────────────────────────
    display.setCell(22, 21, '\\', R);
    for (let c = 23; c <= 56; c++) display.setCell(c, 21, '_', R);
    display.setCell(57, 21, '/', R);

    // ── Fire (rows 19-21) ────────────────────────────────────────────────
    for (let c = 63; c <= 73; c++) display.setCell(c, 19, '~', Y);
    display.setCell(74, 19, '>', Y);

    for (let c = 61; c <= 70; c++) display.setCell(c, 20, '~', O);
    display.setCell(71, 20, '>', O);

    for (let c = 59; c <= 67; c++) display.setCell(c, 21, '~', Y);
    display.setCell(68, 21, '>', Y);
}

// Scene 2: large green potion bottle.
function drawPotionScene(display) {
    const cx = 40;  // center column
    const liq = CLR_BRIGHT_GREEN;
    const rim = CLR_GRAY;

    // Bottle cap / stopper
    display.setCell(cx - 1, 10, '[', rim);
    display.setCell(cx,     10, '=', liq);
    display.setCell(cx + 1, 10, ']', rim);

    // Neck (rows 11-12)
    for (let row = 11; row <= 12; row++) {
        display.setCell(cx - 1, row, '|', rim);
        display.setCell(cx,     row, '!', liq);
        display.setCell(cx + 1, row, '|', rim);
    }

    // Shoulder (row 13)
    display.setCell(cx - 4, 13, '/', rim);
    display.setCell(cx - 3, 13, '_', rim);
    display.setCell(cx - 2, 13, '_', rim);
    display.setCell(cx - 1, 13, '(', rim);
    display.setCell(cx,     13, '!', liq);
    display.setCell(cx + 1, 13, ')', rim);
    display.setCell(cx + 2, 13, '_', rim);
    display.setCell(cx + 3, 13, '_', rim);
    display.setCell(cx + 4, 13, '\\', rim);

    // Body (rows 14-20)
    for (let row = 14; row <= 20; row++) {
        display.setCell(cx - 6, row, '|', rim);
        for (let col = cx - 5; col <= cx + 5; col++) {
            display.setCell(col, row, '!', liq);
        }
        display.setCell(cx + 6, row, '|', rim);
    }

    // Base (row 21)
    display.setCell(cx - 6, 21, '\\', rim);
    for (let col = cx - 5; col <= cx + 5; col++) {
        display.setCell(col, 21, '_', rim);
    }
    display.setCell(cx + 6, 21, '/', rim);

    // Label in the middle of the body
    const label = 'POTION';
    const labelCol = cx - Math.floor(label.length / 2);
    for (let i = 0; i < label.length; i++) {
        display.setCell(labelCol + i, 17, label[i], CLR_WHITE);
    }
}

// High-score table display.
async function drawHighScores(display) {
    const scores = loadScores();
    const title = 'High Scores';
    const titleRow = 11;
    const headerRow = 13;
    let row = 14;

    await display.putstr(Math.floor((80 - title.length) / 2), titleRow, title, CLR_YELLOW);
    await display.putstr(4, headerRow, formatTopTenHeader(), CLR_GRAY);

    if (scores.length === 0) {
        const msg = '(no scores recorded yet)';
        await display.putstr(Math.floor((80 - msg.length) / 2), row + 2, msg, CLR_GRAY);
    } else {
        const maxEntries = Math.min(scores.length, 6);
        for (let i = 0; i < maxEntries; i++) {
            const lines = formatTopTenEntry(scores[i], i + 1);
            for (const line of lines) {
                if (row < 22) {
                    await display.putstr(4, row++, line, CLR_WHITE);
                }
            }
        }
    }
}

// Render a full promo frame: logo + version + scene + prompt.
async function renderFrame(display, sceneIdx) {
    const version = `NetHack ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL}`;
    const prompt  = '\u2014 Press any key to play \u2014';

    display.clearScreen();

    // Centered logo (rows 2-6)
    drawLogo(display, 2, CLR_YELLOW);

    // Version line (row 8)
    await display.putstr(Math.floor((80 - version.length) / 2), 8, version, CLR_GRAY);

    // Scene
    const scenes = [drawDragonScene, drawHighScores, drawPotionScene];
    scenes[sceneIdx % scenes.length](display);

    // Always-visible play prompt (row 22)
    await display.putstr(Math.floor((80 - prompt.length) / 2), 22, prompt, CLR_WHITE);
}

export class Promo {
    // Run the attract-mode loop.
    // Displays cycling scenes until any key is pressed.
    // Calls onPlay() when the user presses a key.
    async run(display, nhgetch, onPlay) {
        let sceneIdx = 0;
        let keyPressed = false;

        // A single persistent key-read call covers all scene transitions.
        // Racing it against per-scene timers lets us advance slides without
        // calling it again (which would overwrite the pending resolver).
        let pressedKey = null;
        const keyPromise = nhgetch().then(ch => {
            keyPressed = true;
            pressedKey = ch;
            return ch;
        });

        while (!keyPressed) {
            await renderFrame(display, sceneIdx);

            // Wait 5 s or until a key arrives — whichever comes first.
            const timer = new Promise(resolve => setTimeout(resolve, 5000));
            await Promise.race([keyPromise, timer]);

            if (keyPressed) break;
            sceneIdx++;
        }

        // Ctrl-C: enter secret shell instead of starting a game
        if (pressedKey === 3) {
            await runShell(display, nhgetch, { restart: onPlay });
            // After shell exits, return to promo loop
            return this.run(display, nhgetch, onPlay);
        }

        onPlay();
    }
}
