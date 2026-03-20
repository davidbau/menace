// Debug script: investigate why dog 'd' not shown at step 6 of theme34_seed2251
import { replaySession } from '../js/replay_core.js';
import { prepareReplayArgs } from '../js/replay_compare.js';
import { readFileSync } from 'fs';
import { seeWithInfraredForMap } from '../js/display.js';
import { couldsee } from '../js/vision.js';
import { INFRAVISION } from '../js/const.js';

const sessionFile = 'test/comparison/sessions/pending/theme34_seed2251_dwarfval_explore_gameplay.session.json';
const session = JSON.parse(readFileSync(sessionFile, 'utf8'));

const args = prepareReplayArgs(session.seed, session, { captureScreens: true });
const keys = args.keys.slice(0, 6);

const result = await replaySession(args.seed, {
    ...args.opts,
    captureScreens: true,
    onKey: ({ index, ch, game }) => {
        if (index === 5) { // after step 6 completes
            const map = game.lev || game.map;
            const player = game.u || game.player;
            const dog = map?.monsters?.find(m => !m.dead && m.mtame && m.mx === 18 && m.my === 3);

            console.log(`\n=== After step 6 ===`);
            console.log('Player pos:', player?.x, player?.y);
            console.log('Dog at (18,3):', dog ? 'found' : 'NOT FOUND');
            if (dog) {
                console.log('  dog.mtame:', dog.mtame, 'dog.minvis:', dog.minvis, 'dog.mundetected:', dog.mundetected);
                const mdat = dog.data || dog.type;
                console.log('  mdat.mname:', mdat?.mname);
            }

            // Check FOV
            const fovAt18_3 = game.fov?.canSee ? game.fov.canSee(18, 3) : game.fov?.visible?.[18]?.[3];
            console.log('fov.canSee(18,3):', fovAt18_3);

            // Check infravision
            const hasInfra = !!(player?.uprops?.[INFRAVISION]?.extrinsic || player?.uprops?.[INFRAVISION]?.intrinsic || player?.infravision || player?.Infravision);
            console.log('player has INFRAVISION:', hasInfra);

            if (dog) {
                console.log('see_with_infrared for dog:', seeWithInfraredForMap(dog, map, player));
            }

            // Check couldsee
            console.log('couldsee(map, player, 18, 3):', couldsee(map, player, 18, 3));

            // Check loc at (18,3)
            const loc = map?.at?.(18, 3);
            if (loc) {
                console.log('loc(18,3).typ:', loc.typ, 'lit:', loc.lit, 'seenv:', loc.seenv);
                console.log('cache: _displayCell=', JSON.stringify(loc._displayCell), '_displayCellStepIndex=', loc._displayCellStepIndex, 'map._replayStepIndex=', map._replayStepIndex);
            }

            // Check fov._cs at (18,3)
            if (game.fov?._cs) {
                const COULD_SEE = 1, IN_SIGHT = 2;
                console.log('fov._cs[3][18]:', game.fov._cs[3]?.[18], '(IN_SIGHT=' + IN_SIGHT + ', COULD_SEE=' + COULD_SEE + ')');
            }
        }
    },
}, keys);

function stripAnsi(s) {
    return s.replace(/\x1b\[(\d*)C/g, (_m, n) => ' '.repeat(Math.max(1, Number(n || '1'))))
            .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
            .replace(/[\x00-\x08\x0b-\x1f]/g, '');
}

console.log('\n=== Screens ===');
console.log('Step 5:', stripAnsi(result.steps[5]?.screen?.split('\n')?.[4] || ''));
console.log('Step 6:', stripAnsi(result.steps[6]?.screen?.split('\n')?.[4] || ''));
