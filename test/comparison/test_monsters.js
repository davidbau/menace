// Check monster count after map generation
import { createHeadlessGame } from './oracle.js';
import fs from 'fs';

const session = JSON.parse(fs.readFileSync('test/comparison/sessions/seed201_fight_prefix_gameplay.session.json'));

console.log('=== Monster Check: seed', session.seed, '===');

const result = await createHeadlessGame(session.seed, {
    wizard: true,
    name: session.options?.name || 'Wizard',
});

if (result.error) {
    console.log('ERROR:', result.error);
    process.exit(1);
}

const { game, rng } = result;

// Run parityTestInit which does map gen + consumption
rng.enableRngLog();
await game.parityTestInit(session);

console.log('After parityTestInit:', rng.getRngLog().length, 'RNG calls');

// Check monsters on map
const monsters = game.map.monsters || [];
console.log('Monster count:', monsters.length);

for (const mon of monsters) {
    console.log(`  Monster at (${mon.x}, ${mon.y}): ${mon.name || mon.type || 'unknown'}`);
}

// Check player position
console.log('Player at:', game.player.x, game.player.y);

// Check if there's a pet
const pet = monsters.find(m => m.tame || m.mtame);
console.log('Pet found:', pet ? 'yes' : 'no');
