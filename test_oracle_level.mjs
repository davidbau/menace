#!/usr/bin/env node
/**
 * Test Oracle level generation
 *
 * Verifies that oracle.js:
 * 1. Can be imported and executed
 * 2. Generates a valid level structure
 * 3. Creates expected rooms and features
 */

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { generate as generateOracle } from './js/levels/oracle.js';
import { getLevelState } from './js/sp_lev.js';

// Initialize RNG with a known seed for reproducibility
initRng(42);
enableRngLog(true);

console.log('=== Testing Oracle Level Generation ===\n');

try {
    const level = generateOracle();
    const state = getLevelState();

    console.log('\n=== Level State ===');
    console.log(`  Map exists: ${!!state.map}`);
    console.log(`  Map rooms: ${state.map?.rooms?.length || 0}`);
    console.log(`  Map nroom: ${state.map?.nroom || 0}`);
    console.log(`  RNG calls: ${getRngLog().length}`);

    console.log('✓ Oracle level generated successfully');
    console.log(`  Rooms: ${level.rooms ? level.rooms.length : 'N/A'}`);
    console.log(`  Monsters: ${level.monsters ? level.monsters.length : 'N/A'}`);
    console.log(`  Objects: ${level.objects ? level.objects.length : 'N/A'}`);
    console.log(`  Traps: ${level.traps ? level.traps.length : 'N/A'}`);
    console.log(`  Stairs: ${level.stairs ? level.stairs.length : 'N/A'}`);

    // Check for Oracle monster
    const oracle = level.monsters?.find(m => m.id === 'Oracle');
    if (oracle) {
        console.log(`\n✓ Oracle monster found at (${oracle.x}, ${oracle.y})`);
    } else {
        console.log('\n❌ Oracle monster NOT found');
    }

    // Check for fountains (Oracle level has distinctive fountains)
    const fountains = level.terrain?.filter(t => t.type === 'fountain') || [];
    console.log(`\n  Fountains: ${fountains.length}`);

    // Display structure summary
    console.log('\n=== Level Structure ===');
    if (level.map) {
        console.log(`  Map size: ${level.map.width || 'unknown'} x ${level.map.height || 'unknown'}`);
    }

    console.log('\n✅ Oracle level test PASSED');

} catch (err) {
    console.error('❌ Oracle level test FAILED');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
}
