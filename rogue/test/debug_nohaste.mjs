// Debug the nohaste session RNG divergence
import { readFileSync } from 'fs';
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { command } from '../js/command.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const session = JSON.parse(readFileSync('./sessions/cov_nohaste.json', 'utf8'));
const cSteps = session.steps.filter(s => s.key !== '\x00');
const seed = session.seed;
const keys = cSteps.map(s => s.key).join('');

const display = new MockDisplay();
const input = new MockInput();

const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
g.wizard = true; g.waswizard = true;
setGame(g);
wireGameDeps(g);
await startGameState(g, seed);

class SessionDone extends Error { constructor() { super('done'); } }
let keyIndex = 0;
let stepNum = 0;

input.getKey = async function () {
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];
    if (keyIndex >= keys.length) throw new SessionDone();
    const key = keys[keyIndex];
    if (stepNum <= 2) {
        console.log(`JS step ${stepNum} key=${JSON.stringify(key)} rng=${JSON.stringify(rng)}`);
        console.log(`C  step ${stepNum} key=${JSON.stringify(cSteps[stepNum]?.key)} rng=${JSON.stringify(cSteps[stepNum]?.rng)}`);
        console.log();
    }
    stepNum++;
    return keys[keyIndex++];
};

try {
    const { roomin } = await import('../js/rooms.js');
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
} catch (e) {
    if (!(e instanceof SessionDone)) console.error('Error:', e.message);
}
// Now compute full rng values for the teleport step
import { readFileSync } from 'fs';
