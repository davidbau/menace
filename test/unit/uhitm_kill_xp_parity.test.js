import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { handleMonsterKilled } from '../../js/uhitm.js';
import { mons } from '../../js/monsters.js';
import { setGame } from '../../js/gstate.js';
import { A_CON, A_WIS } from '../../js/const.js';

describe('uhitm kill xp parity', () => {
    afterEach(() => {
        setGame(null);
    });

    test('hero kill uses faithful experience() path for immediate level gain', async () => {
        const messages = [];
        const display = {
            async putstr_message(msg) {
                messages.push(String(msg));
            },
        };
        const game = {
            display,
            flags: {},
            disp: {},
            mvitals: [],
        };
        setGame(game);

        const player = {
            x: 10,
            y: 10,
            hp: 12,
            uhp: 12,
            uhpmax: 12,
            pw: 7,
            pwhmax: 7,
            uen: 7,
            uenmax: 7,
            uexp: 0,
            urexp: 0,
            exp: 0,
            score: 0,
            ulevel: 1,
            ulevelmax: 1,
            roleIndex: 0,
            roleMnum: 382,
            race: 0,
            attributes: {
                [A_CON]: 10,
                [A_WIS]: 10,
            },
            alignment: 0,
            alignmentRecord: 0,
            hasProp() {
                return false;
            },
        };

        const monster = {
            data: mons[1],
            mndx: 1,
            m_lev: 1,
            mhp: 1,
            mx: 11,
            my: 10,
            malign: 0,
            mpeaceful: false,
            mtame: 0,
            mcloned: false,
        };

        const map = {
            flags: { deathdrops: false },
        };

        await handleMonsterKilled(player, monster, display, map);

        assert.equal(player.ulevel, 2);
        assert.equal(player.uexp, 26);
        assert.equal(player.exp, 26);
        assert.equal(messages.includes('Welcome to experience level 2.'), true);
    });
});
