import { readFileSync } from 'fs';
import { initRng, enableRngLog, getRngLog, rn2, rnd, rn1 } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';
import { rhack } from '../../js/cmd.js';
import { movemon } from '../../js/monmove.js';
import { FOV } from '../../js/vision.js';
import { NORMAL_SPEED, A_DEX, A_CON } from '../../js/config.js';
import { getSessionStartup } from './session_helpers.js';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed1.session.json', 'utf-8'));

enableRngLog();
initRng(session.seed);
initLevelGeneration();
const map = makelevel(1);
wallification(map);
const player = new Player();
player.initRole(11);

const sessionStartup = getSessionStartup(session);
const screen = sessionStartup?.screen || [];
for (const line of screen) {
    if (!line) continue;
    const m = line.match(/St:(\d+)\s+Dx:(\d+)\s+Co:(\d+)\s+In:(\d+)\s+Wi:(\d+)\s+Ch:(\d+)/);
    if (m) {
        player.attributes[0] = parseInt(m[1]); player.attributes[1] = parseInt(m[4]);
        player.attributes[2] = parseInt(m[5]); player.attributes[3] = parseInt(m[2]);
        player.attributes[4] = parseInt(m[3]); player.attributes[5] = parseInt(m[6]);
    }
    const hpm = line.match(/HP:(\d+)\((\d+)\)\s+Pw:(\d+)\((\d+)\)\s+AC:(\d+)/);
    if (hpm) {
        player.hp = parseInt(hpm[1]); player.hpmax = parseInt(hpm[2]);
        player.pw = parseInt(hpm[3]); player.pwmax = parseInt(hpm[4]);
        player.ac = parseInt(hpm[5]);
    }
}
player.weapon = { name: 'spear', wsdam: 6, wldam: 8, enchantment: 1 };
if (map.upstair) { player.x = map.upstair.x; player.y = map.upstair.y; }
const initResult = simulatePostLevelInit(player, map, 1);

const nullDisplay = { putstr_message() {}, putstr_map() {} };
const fov = new FOV();

const game = {
    player, map, display: nullDisplay, fov,
    levels: { 1: map }, gameOver: false, turnCount: 0, wizard: true,
    seerTurn: initResult.seerTurn,
    mcalcmove(mon) {
        let mmove = mon.speed;
        const mmoveAdj = mmove % NORMAL_SPEED;
        mmove -= mmoveAdj;
        if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
        return mmove;
    },
    dosounds() {
        const f = this.map.flags;
        if (f.nfountains && !rn2(400)) { rn2(3); }
        if (f.nsinks && !rn2(300)) { rn2(2); }
        if (f.has_court && !rn2(200)) { return; }
        if (f.has_swamp && !rn2(200)) { rn2(2); return; }
        if (f.has_vault && !rn2(200)) { rn2(2); return; }
        if (f.has_beehive && !rn2(200)) { return; }
        if (f.has_morgue && !rn2(200)) { return; }
        if (f.has_barracks && !rn2(200)) { rn2(3); return; }
        if (f.has_zoo && !rn2(200)) { return; }
        if (f.has_shop && !rn2(200)) { rn2(2); return; }
        if (f.has_temple && !rn2(200)) { return; }
    },
    simulateTurnEnd() {
        this.turnCount++;
        this.player.turns = this.turnCount;
        for (const mon of this.map.monsters) {
            if (mon.dead) continue;
            mon.movement += this.mcalcmove(mon);
        }
        rn2(70);
        if (this.player.hp < this.player.hpmax) {
            const con = this.player.attributes ? this.player.attributes[A_CON] : 10;
            const heal = (this.player.level + con) > rn2(100) ? 1 : 0;
            if (heal) this.player.hp = Math.min(this.player.hp + heal, this.player.hpmax);
        }
        this.dosounds();
        rn2(20);
        this.player.hunger--;
        const moves = this.turnCount + 1;
        if (moves % 10 === 0) rn2(19);
        const dex = this.player.attributes ? this.player.attributes[A_DEX] : 14;
        rn2(40 + dex * 3);
        if (this.turnCount >= this.seerTurn) {
            this.seerTurn = this.turnCount + rn1(31, 15);
        }
    }
};

// Show ALL monsters before starting
console.log('=== ALL MONSTERS ON MAP ===');
for (const mon of map.monsters) {
    console.log(`  ${mon.name} at (${mon.mx},${mon.my}) tame=${mon.tame} sleeping=${mon.sleeping} speed=${mon.speed} mvmt=${mon.movement} dead=${mon.dead}`);
}
console.log();

// Run steps 0-17
for (let step = 0; step <= 17; step++) {
    const st = session.steps[step];
    const ch = st.key.charCodeAt(0);

    // Before step, show living monsters with movement
    const living = map.monsters.filter(m => !m.dead);
    const monInfo = living.map(m => `${m.name}@(${m.mx},${m.my}) mvmt=${m.movement} slp=${m.sleeping}`).join(', ');

    const result = await rhack(ch, game);
    if (result && result.tookTime) {
        movemon(game.map, game.player, game.display, game.fov);
        game.simulateTurnEnd();
    }

    const livingAfter = map.monsters.filter(m => !m.dead);
    console.log(`step ${step}: player=(${player.x},${player.y}) | before: ${monInfo} | living_after=${livingAfter.length}`);
}
