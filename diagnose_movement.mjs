#!/usr/bin/env node
/**
 * Diagnose movement execution failure
 *
 * Runs a stuck seed and logs detailed information about movement commands
 * to understand why position doesn't change.
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';
import { roles } from './js/player.js';

const SEED = 55555; // Known stuck seed
const MAX_TURNS = 500;
const ROLE_INDEX = 12; // Wizard

console.log(`=== Movement Execution Diagnostic ===`);
console.log(`Seed: ${SEED}, Max turns: ${MAX_TURNS}\n`);

let failedMoveCount = 0;
let totalMoveCount = 0;

// Create game and agent manually so we can patch before running
const game = new HeadlessGame(SEED, ROLE_INDEX);
const adapter = new HeadlessAdapter(game);
const agent = new Agent(adapter, {
    maxTurns: MAX_TURNS,
    onTurn: (info) => {
        if (info.turn % 100 === 0) {
            console.log(`Turn ${info.turn}: Dlvl=${info.dlvl}, pos=(${info.position?.x},${info.position?.y}), HP=${info.hp}/${info.hpmax}`);
        }
    }
});

// Patch agent._act to log movement execution
const originalAct = agent._act.bind(agent);
agent._act = async function(action) {
    const beforePos = { x: this.status?.x, y: this.status?.y };
    const turnNum = this.turnNumber;

    // Skip logging if position not yet initialized
    if (beforePos.x === undefined || beforePos.y === undefined) {
        await originalAct.call(this, action);
        return;
    }

    // Log movement actions only
    const isMovement = (action.type === 'navigate' || action.type === 'explore');
    if (isMovement) {
        totalMoveCount++;
    }

    // Execute the action
    await originalAct.call(this, action);

    // Check position after
    const afterPos = { x: this.status?.x, y: this.status?.y };

    if (isMovement) {
        const moved = (beforePos.x !== afterPos.x || beforePos.y !== afterPos.y);

        if (!moved) {
            failedMoveCount++;

            // Only log first 20 failures to avoid spam
            if (failedMoveCount <= 20) {
                console.log(`\n[Turn ${turnNum}] ⚠️  MOVEMENT FAILED (${failedMoveCount})`);
                console.log(`  BEFORE: pos=(${beforePos.x},${beforePos.y})`);
                console.log(`  Action: ${action.type} key='${action.key}'`);
                console.log(`  Reason: ${action.reason}`);
                console.log(`  AFTER:  pos=(${afterPos.x},${afterPos.y})`);
                console.log(`  Message: "${this.screen.message || '(none)'}"`);

                // Check for obstacles
                const dirs = {
                    'h': [-1, 0], 'j': [0, 1], 'k': [0, -1], 'l': [1, 0],
                    'y': [-1, -1], 'u': [1, -1], 'b': [-1, 1], 'n': [1, 1]
                };
                const dir = dirs[action.key];
                if (dir) {
                    const tx = beforePos.x + dir[0];
                    const ty = beforePos.y + dir[1];
                    const cell = this.dungeon.currentLevel.at(tx, ty);
                    const screenCell = this.screen.grid[ty]?.[tx];
                    console.log(`  Target (${tx},${ty}):`);
                    console.log(`    Map: type=${cell?.type}, walkable=${cell?.walkable}, explored=${cell?.explored}`);
                    console.log(`    Screen: char='${screenCell?.ch || '?'}' (code=${screenCell?.ch?.charCodeAt(0) || 0})`);

                    // Check for monsters
                    if (cell?.monster) {
                        console.log(`    Monster: '${cell.monster.ch}'`);
                    }
                }

                // Check pet state
                if (this.pet) {
                    console.log(`  Pet: pos=(${this.pet.x},${this.pet.y}), ch='${this.pet.ch}'`);
                    const petBlocking = this.pet && dir &&
                        this.pet.x === beforePos.x + dir[0] &&
                        this.pet.y === beforePos.y + dir[1];
                    if (petBlocking) {
                        console.log(`  ⚠️  PET IS BLOCKING THE PATH!`);
                    }
                }
            }
        }
    }
};

// Run the agent
const stats = await agent.run();

console.log(`\n=== Final Results ===`);
console.log(`Turns: ${stats.turns}`);
console.log(`Max depth reached: ${stats.maxDepth}`);
console.log(`Final position: (${stats.finalPos?.x}, ${stats.finalPos?.y})`);
console.log(`Died: ${stats.died ? 'yes' : 'no'}`);
console.log(`Death cause: ${stats.deathCause || 'survived'}`);
console.log(`\nMovement stats:`);
console.log(`  Total movement commands: ${totalMoveCount}`);
console.log(`  Failed movements: ${failedMoveCount}`);
if (totalMoveCount > 0) {
    console.log(`  Failure rate: ${(100 * failedMoveCount / totalMoveCount).toFixed(1)}%`);
}
