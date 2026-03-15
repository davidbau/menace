/**
 * game.js — GameState class for Rogue 3.6 JS port.
 *
 * Holds all global variables from rogue.h/init.c.
 * Initialized fresh each game via new GameState().
 */

import {
  MAXROOMS, MAXTRAPS, MAXPOTIONS, MAXSCROLLS, MAXRINGS, MAXSTICKS,
  MAXWEAPONS, MAXARMORS, NUMTHINGS,
  HUNGERTIME, LINES, COLS,
} from './const.js';
import { monsters as monstersData, things_base, s_magic_base, p_magic_base,
         r_magic_base, ws_magic_base, a_class, a_names, a_chances, w_names,
         lvl_mons, wand_mons } from './data.js';

// MAXDAEMONS is defined locally (20)
const MAXDAEMONS = 20;
const DAEMON_TIME = -1;
const EMPTY = 0;

export class GameState {
  constructor() {
    // ---- Display / IO ----
    this.display = null;
    this.input = null;
    this.rawRngLog = [];

    // ---- Screen state ----
    // stdscr: the main dungeon map (24×80), 0-indexed [y][x]
    this.stdscr = [];
    // mw: monster window overlay (24×80), 0-indexed [y][x]
    this.mw = [];
    // cw: player's view (24×80), 0-indexed [y][x] — what gets displayed
    this.cw = [];
    // hw: help/inventory overlay window (24×80), drawn on top of all when active
    this.hw = [];
    for (let r = 0; r < 24; r++) {
      this.stdscr[r] = new Array(80).fill(' ');
      this.mw[r] = new Array(80).fill(' ');
      this.cw[r] = new Array(80).fill(' ');
      this.hw[r] = new Array(80).fill(' ');
    }

    // ---- Player ----
    this.player = {
      t_pos: { x: 0, y: 0 },
      t_turn: false,
      t_type: '@',
      t_disguise: '@',
      t_oldch: ' ',
      t_dest: null,
      t_flags: 0,
      t_stats: {
        s_str: { st_str: 18, st_add: 0 },
        s_exp: 0,
        s_lvl: 1,
        s_arm: 10,
        s_hpt: 12,
        s_dmg: "1d4",
      },
      t_pack: null,
    };
    this.max_stats = {
      s_str: { st_str: 18, st_add: 0 },
      s_exp: 0,
      s_lvl: 1,
      s_arm: 10,
      s_hpt: 12,
      s_dmg: "1d4",
    };

    // ---- Level ----
    this.level = 1;
    this.max_level = 1;
    this.rooms = [];
    for (let i = 0; i < MAXROOMS; i++) {
      this.rooms[i] = {
        r_pos: { x: 0, y: 0 },
        r_max: { x: 0, y: 0 },
        r_gold: { x: 0, y: 0 },
        r_goldval: 0,
        r_flags: 0,
        r_nexits: 0,
        r_exit: [
          { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
        ],
      };
    }
    this.oldrp = null;

    // ---- Monsters / Objects ----
    this.mlist = null;
    this.lvl_obj = null;
    this.ntraps = 0;
    this.traps = [];
    for (let i = 0; i < MAXTRAPS; i++) {
      this.traps[i] = { tr_pos: { x: 0, y: 0 }, tr_type: 0, tr_flags: 0 };
    }

    // ---- Pack (player inventory) ----
    this.pack = null;

    // ---- Equipment ----
    this.cur_weapon = null;
    this.cur_armor = null;
    this.cur_ring = [null, null];

    // ---- Stats / Counters ----
    this.purse = 0;
    this.mpos = 0;
    this.no_move = 0;
    this.no_command = 0;
    this.inpack = 0;
    this.max_hp = 12;
    this.total = 0;
    this.no_food = 0;
    this.count = 0;
    this.fung_hit = 0;
    this.quiet = 0;
    this.food_left = HUNGERTIME;
    this.group = 1;
    this.hungry_state = 0;
    this.lastscore = -1;
    this.dnum = 0;

    // ---- Flags ----
    this.running = false;
    this.playing = true;
    this.wizard = false;
    this.after = true;
    this.notify = true;
    this.fight_flush = false;
    this.terse = false;
    this.door_stop = false;
    this.jump = false;
    this.slow_invent = false;
    this.firstmove = false;
    this.askme = false;
    this.waswizard = false;
    this.amulet = false;
    this.in_shell = false;

    // ---- Strings ----
    this.take = 0;
    this.prbuf = "";
    this.runch = 'h';
    this.huh = "";
    this.whoami = "rogue";
    this.fruit = "papaya";
    this.file_name = "/tmp/rogue.sav";

    // ---- Coordinates ----
    this.oldpos = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0 };

    // ---- Monster table (live copy, modifiable for genocide) ----
    this.monsters = monstersData.map(m => ({
      m_name: m.m_name,
      m_carry: m.m_carry,
      m_flags: m.m_flags,
      m_stats: {
        s_str: { st_str: m.m_stats.s_str.st_str, st_add: m.m_stats.s_str.st_add },
        s_exp: m.m_stats.s_exp,
        s_lvl: m.m_stats.s_lvl,
        s_arm: m.m_stats.s_arm,
        s_hpt: m.m_stats.s_hpt,
        s_dmg: m.m_stats.s_dmg,
      },
    }));

    // ---- Probability tables (cumulative, modified during init) ----
    this.things = things_base.map(t => ({ mi_name: t.mi_name, mi_prob: t.mi_prob }));
    this.s_magic = s_magic_base.map(m => ({ mi_name: m.mi_name, mi_prob: m.mi_prob, mi_worth: m.mi_worth }));
    this.p_magic = p_magic_base.map(m => ({ mi_name: m.mi_name, mi_prob: m.mi_prob, mi_worth: m.mi_worth }));
    this.r_magic = r_magic_base.map(m => ({ mi_name: m.mi_name, mi_prob: m.mi_prob, mi_worth: m.mi_worth }));
    this.ws_magic = ws_magic_base.map(m => ({ mi_name: m.mi_name, mi_prob: m.mi_prob, mi_worth: m.mi_worth }));

    // ---- Item name arrays (set by init functions) ----
    this.s_names = new Array(MAXSCROLLS).fill(null);
    this.p_colors = new Array(MAXPOTIONS).fill(null);
    this.r_stones = new Array(MAXRINGS).fill(null);
    this.ws_made = new Array(MAXSTICKS).fill(null);
    this.ws_type = new Array(MAXSTICKS).fill(null);
    this.w_names = [...w_names];
    this.a_names = [...a_names];
    this.a_class = [...a_class];
    this.a_chances = [...a_chances];

    // ---- Knowledge flags ----
    this.s_know = new Array(MAXSCROLLS).fill(false);
    this.p_know = new Array(MAXPOTIONS).fill(false);
    this.r_know = new Array(MAXRINGS).fill(false);
    this.ws_know = new Array(MAXSTICKS).fill(false);

    // ---- Guess arrays ----
    this.s_guess = new Array(MAXSCROLLS).fill(null);
    this.p_guess = new Array(MAXPOTIONS).fill(null);
    this.r_guess = new Array(MAXRINGS).fill(null);
    this.ws_guess = new Array(MAXSTICKS).fill(null);

    // ---- Monster lists (modifiable for genocide) ----
    this.lvl_mons = [...lvl_mons];
    this.wand_mons = [...wand_mons];

    // ---- Daemon/fuse system ----
    // Each slot: { d_type: EMPTY/BEFORE/AFTER, d_func, d_arg, d_time }
    // d_time == -1 means daemon (runs every turn); > 0 means fuse
    this.d_list = [];
    for (let i = 0; i < MAXDAEMONS; i++) {
      this.d_list[i] = { d_type: 0, d_func: null, d_arg: 0, d_time: 0 };
    }

    // rollwand state
    this._rollwand_between = 0;
  }
}
