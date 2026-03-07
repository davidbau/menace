/**
 * save.js — Game save/restore for Rogue 3.6 JS port.
 * Saves full game state to localStorage as JSON.
 */

import { game, setGame } from './gstate.js';
import { getRngSeed, setRngSeed } from './rng.js';
import { GameState } from './game.js';

const SAVE_KEY = 'rogue-save';

// ===== Daemon function registry =====
// Maps function references ↔ names for serialization.

const _daemonByName = {};
const _daemonName = new Map();

export function registerDaemon(name, fn) {
  _daemonByName[name] = fn;
  _daemonName.set(fn, name);
}

function serializeDaemonFn(fn) {
  return fn ? (_daemonName.get(fn) || null) : null;
}

function deserializeDaemonFn(name) {
  return name ? (_daemonByName[name] || null) : null;
}

// ===== Linked list helpers =====

function serializeList(head, serializeItem) {
  const items = [];
  for (let node = head; node !== null; node = node.l_next) {
    items.push(serializeItem(node.l_data));
  }
  return items;
}

function deserializeList(items, deserializeItem) {
  if (!items || items.length === 0) return null;
  let head = null, tail = null;
  for (const data of items) {
    const node = { l_data: deserializeItem(data), l_next: null, l_prev: tail };
    if (tail) tail.l_next = node;
    else head = node;
    tail = node;
  }
  return head;
}

// ===== Item (object) serialization =====

function serializeItem(obj) {
  return {
    o_type: obj.o_type,
    o_pos: { x: obj.o_pos.x, y: obj.o_pos.y },
    o_count: obj.o_count,
    o_which: obj.o_which,
    o_hplus: obj.o_hplus,
    o_dplus: obj.o_dplus,
    o_flags: obj.o_flags,
    o_group: obj.o_group,
    o_damage: obj.o_damage,
    o_hurldmg: obj.o_hurldmg,
    o_ac: obj.o_ac,
    o_launch: obj.o_launch,
    o_charges: obj.o_charges,
  };
}

function deserializeItem(d) {
  return {
    o_type: d.o_type || ' ',
    o_pos: { x: d.o_pos?.x || 0, y: d.o_pos?.y || 0 },
    o_count: d.o_count || 1,
    o_which: d.o_which || 0,
    o_hplus: d.o_hplus || 0,
    o_dplus: d.o_dplus || 0,
    o_flags: d.o_flags || 0,
    o_group: d.o_group || 0,
    o_damage: d.o_damage || '0d0',
    o_hurldmg: d.o_hurldmg || '0d0',
    o_ac: d.o_ac !== undefined ? d.o_ac : 11,
    o_launch: d.o_launch !== undefined ? d.o_launch : 100,
    o_charges: d.o_charges || 0,
  };
}

// ===== Monster serialization =====

function serializeMonster(t) {
  return {
    t_pos: { x: t.t_pos.x, y: t.t_pos.y },
    t_turn: t.t_turn,
    t_type: t.t_type,
    t_disguise: t.t_disguise,
    t_oldch: t.t_oldch,
    t_dest_is_player: t.t_dest !== null,
    t_flags: t.t_flags,
    t_stats: {
      s_str: { st_str: t.t_stats.s_str.st_str, st_add: t.t_stats.s_str.st_add },
      s_exp: t.t_stats.s_exp,
      s_lvl: t.t_stats.s_lvl,
      s_arm: t.t_stats.s_arm,
      s_hpt: t.t_stats.s_hpt,
      s_dmg: t.t_stats.s_dmg,
    },
    t_pack: serializeList(t.t_pack, serializeItem),
  };
}

function deserializeMonster(d, playerPos) {
  return {
    t_pos: { x: d.t_pos.x, y: d.t_pos.y },
    t_turn: d.t_turn,
    t_type: d.t_type,
    t_disguise: d.t_disguise,
    t_oldch: d.t_oldch,
    t_dest: d.t_dest_is_player ? playerPos : null,
    t_flags: d.t_flags,
    t_stats: {
      s_str: { st_str: d.t_stats.s_str.st_str, st_add: d.t_stats.s_str.st_add },
      s_exp: d.t_stats.s_exp,
      s_lvl: d.t_stats.s_lvl,
      s_arm: d.t_stats.s_arm,
      s_hpt: d.t_stats.s_hpt,
      s_dmg: d.t_stats.s_dmg,
    },
    t_pack: deserializeList(d.t_pack, deserializeItem),
  };
}

// ===== Screen serialization =====

function serializeScreen(win) {
  return win.map(row => row.join(''));
}

function deserializeScreen(arr) {
  return arr.map(row => {
    const chars = Array.from(row);
    while (chars.length < 80) chars.push(' ');
    return chars;
  });
}

// ===== Pack index helpers =====

function packListToArray(head) {
  const nodes = [];
  for (let node = head; node !== null; node = node.l_next) nodes.push(node);
  return nodes;
}

function findPackIndex(nodes, itemData) {
  if (!itemData) return -1;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].l_data === itemData) return i;
  }
  return -1;
}

// ===== hasSave() =====

export function hasSave() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// ===== saveGame() =====

export async function saveGame() {
  const g = game();

  // Confirm
  const { msg } = await import('./io.js');
  const { readchar } = await import('./io.js');
  const { draw } = await import('./curses.js');
  await msg('Save game? ');
  draw(g.cw);
  const ch = await readchar();
  if (ch !== 'y' && ch !== 'Y') {
    await msg('');
    return false;
  }

  // Build pack index for back-references
  const packNodes = packListToArray(g.pack);
  const cur_weapon_idx = findPackIndex(packNodes, g.cur_weapon);
  const cur_armor_idx  = findPackIndex(packNodes, g.cur_armor);
  const cur_ring_idx   = [
    findPackIndex(packNodes, g.cur_ring[0]),
    findPackIndex(packNodes, g.cur_ring[1]),
  ];

  const state = {
    version: 1,
    rngSeed: getRngSeed(),

    // Player
    player: {
      t_pos: { x: g.player.t_pos.x, y: g.player.t_pos.y },
      t_turn: g.player.t_turn,
      t_type: g.player.t_type,
      t_disguise: g.player.t_disguise,
      t_oldch: g.player.t_oldch,
      t_flags: g.player.t_flags,
      t_stats: {
        s_str: { st_str: g.player.t_stats.s_str.st_str, st_add: g.player.t_stats.s_str.st_add },
        s_exp: g.player.t_stats.s_exp,
        s_lvl: g.player.t_stats.s_lvl,
        s_arm: g.player.t_stats.s_arm,
        s_hpt: g.player.t_stats.s_hpt,
        s_dmg: g.player.t_stats.s_dmg,
      },
    },
    max_stats: {
      s_str: { st_str: g.max_stats.s_str.st_str, st_add: g.max_stats.s_str.st_add },
      s_exp: g.max_stats.s_exp,
      s_lvl: g.max_stats.s_lvl,
      s_arm: g.max_stats.s_arm,
      s_hpt: g.max_stats.s_hpt,
      s_dmg: g.max_stats.s_dmg,
    },

    // Level
    level: g.level,
    max_level: g.max_level,
    rooms: g.rooms.map(r => ({
      r_pos: { x: r.r_pos.x, y: r.r_pos.y },
      r_max: { x: r.r_max.x, y: r.r_max.y },
      r_gold: { x: r.r_gold.x, y: r.r_gold.y },
      r_goldval: r.r_goldval,
      r_flags: r.r_flags,
      r_nexits: r.r_nexits,
      r_exit: r.r_exit.map(e => ({ x: e.x, y: e.y })),
    })),

    // Traps
    ntraps: g.ntraps,
    traps: g.traps.map(t => ({ tr_pos: { x: t.tr_pos.x, y: t.tr_pos.y }, tr_type: t.tr_type, tr_flags: t.tr_flags })),

    // Items on floor
    lvl_obj: serializeList(g.lvl_obj, serializeItem),

    // Monsters
    mlist: serializeList(g.mlist, serializeMonster),

    // Pack
    pack: serializeList(g.pack, serializeItem),
    cur_weapon_idx,
    cur_armor_idx,
    cur_ring_idx,

    // Numeric stats
    purse: g.purse,
    mpos: g.mpos,
    no_move: g.no_move,
    no_command: g.no_command,
    inpack: g.inpack,
    max_hp: g.max_hp,
    total: g.total,
    no_food: g.no_food,
    count: g.count,
    fung_hit: g.fung_hit,
    quiet: g.quiet,
    food_left: g.food_left,
    group: g.group,
    hungry_state: g.hungry_state,
    lastscore: g.lastscore,
    dnum: g.dnum,
    seed: g.seed,

    // Booleans
    running: g.running,
    wizard: g.wizard,
    after: g.after,
    notify: g.notify,
    fight_flush: g.fight_flush,
    terse: g.terse,
    door_stop: g.door_stop,
    jump: g.jump,
    slow_invent: g.slow_invent,
    firstmove: g.firstmove,
    askme: g.askme,
    waswizard: g.waswizard,
    amulet: g.amulet,
    in_shell: g.in_shell,

    // Strings
    take: g.take,
    prbuf: g.prbuf,
    runch: g.runch,
    huh: g.huh,
    whoami: g.whoami,
    fruit: g.fruit,
    file_name: g.file_name,

    // Coords
    oldpos: { x: g.oldpos.x, y: g.oldpos.y },
    delta: { x: g.delta.x, y: g.delta.y },

    // Monster table (genocide-modified)
    monsters: g.monsters.map(m => ({
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
    })),

    // Item name arrays (randomized)
    s_names: g.s_names,
    p_colors: g.p_colors,
    r_stones: g.r_stones,
    ws_made: g.ws_made,
    ws_type: g.ws_type,

    // Knowledge
    s_know: g.s_know,
    p_know: g.p_know,
    r_know: g.r_know,
    ws_know: g.ws_know,
    s_guess: g.s_guess,
    p_guess: g.p_guess,
    r_guess: g.r_guess,
    ws_guess: g.ws_guess,

    // Monster lists (for genocide)
    lvl_mons: g.lvl_mons,
    wand_mons: g.wand_mons,

    // Daemon/fuse system
    d_list: g.d_list.map(d => ({
      d_type: d.d_type,
      d_func: serializeDaemonFn(d.d_func),
      d_arg: d.d_arg,
      d_time: d.d_time,
    })),

    // Screens
    stdscr: serializeScreen(g.stdscr),
    cw: serializeScreen(g.cw),
    mw: serializeScreen(g.mw),
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    await msg('Saved.');
    return true;
  } catch (e) {
    await msg(`Save failed: ${e.message}`);
    return false;
  }
}

// ===== loadGameState(g) =====
// Restores all fields from localStorage into an existing GameState.
// Call after wireGameDeps() so daemon functions are registered.

export function loadGameState(g) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;

  let s;
  try {
    s = JSON.parse(raw);
  } catch (e) {
    return false;
  }

  setRngSeed(s.rngSeed);

  // Player
  g.player.t_pos.x = s.player.t_pos.x;
  g.player.t_pos.y = s.player.t_pos.y;
  g.player.t_turn = s.player.t_turn;
  g.player.t_type = s.player.t_type;
  g.player.t_disguise = s.player.t_disguise;
  g.player.t_oldch = s.player.t_oldch;
  g.player.t_flags = s.player.t_flags;
  g.player.t_stats.s_str.st_str = s.player.t_stats.s_str.st_str;
  g.player.t_stats.s_str.st_add = s.player.t_stats.s_str.st_add;
  g.player.t_stats.s_exp = s.player.t_stats.s_exp;
  g.player.t_stats.s_lvl = s.player.t_stats.s_lvl;
  g.player.t_stats.s_arm = s.player.t_stats.s_arm;
  g.player.t_stats.s_hpt = s.player.t_stats.s_hpt;
  g.player.t_stats.s_dmg = s.player.t_stats.s_dmg;

  Object.assign(g.max_stats, {
    s_str: { ...s.max_stats.s_str },
    s_exp: s.max_stats.s_exp,
    s_lvl: s.max_stats.s_lvl,
    s_arm: s.max_stats.s_arm,
    s_hpt: s.max_stats.s_hpt,
    s_dmg: s.max_stats.s_dmg,
  });

  g.level = s.level;
  g.max_level = s.max_level;

  for (let i = 0; i < s.rooms.length && i < g.rooms.length; i++) {
    const r = s.rooms[i], gr = g.rooms[i];
    gr.r_pos = { ...r.r_pos };
    gr.r_max = { ...r.r_max };
    gr.r_gold = { ...r.r_gold };
    gr.r_goldval = r.r_goldval;
    gr.r_flags = r.r_flags;
    gr.r_nexits = r.r_nexits;
    gr.r_exit = r.r_exit.map(e => ({ ...e }));
  }

  g.ntraps = s.ntraps;
  for (let i = 0; i < s.traps.length && i < g.traps.length; i++) {
    g.traps[i] = { tr_pos: { ...s.traps[i].tr_pos }, tr_type: s.traps[i].tr_type, tr_flags: s.traps[i].tr_flags };
  }

  g.lvl_obj = deserializeList(s.lvl_obj, deserializeItem);
  g.mlist = deserializeList(s.mlist, d => deserializeMonster(d, g.player.t_pos));

  // Pack + equipment back-references
  g.pack = deserializeList(s.pack, deserializeItem);
  const packNodes = packListToArray(g.pack);
  g.cur_weapon = s.cur_weapon_idx >= 0 && packNodes[s.cur_weapon_idx] ? packNodes[s.cur_weapon_idx].l_data : null;
  g.cur_armor  = s.cur_armor_idx  >= 0 && packNodes[s.cur_armor_idx]  ? packNodes[s.cur_armor_idx].l_data  : null;
  g.cur_ring[0] = s.cur_ring_idx[0] >= 0 && packNodes[s.cur_ring_idx[0]] ? packNodes[s.cur_ring_idx[0]].l_data : null;
  g.cur_ring[1] = s.cur_ring_idx[1] >= 0 && packNodes[s.cur_ring_idx[1]] ? packNodes[s.cur_ring_idx[1]].l_data : null;
  // Also sync player.t_pack to pack (some code accesses both)
  g.player.t_pack = g.pack;

  // Numeric stats
  const numFields = ['purse','mpos','no_move','no_command','inpack','max_hp','total',
    'no_food','count','fung_hit','quiet','food_left','group','hungry_state',
    'lastscore','dnum','seed','take'];
  for (const f of numFields) if (s[f] !== undefined) g[f] = s[f];

  // Booleans
  const boolFields = ['running','wizard','after','notify','fight_flush','terse','door_stop',
    'jump','slow_invent','firstmove','askme','waswizard','amulet','in_shell'];
  for (const f of boolFields) if (s[f] !== undefined) g[f] = s[f];

  // Strings
  const strFields = ['prbuf','runch','huh','whoami','fruit','file_name'];
  for (const f of strFields) if (s[f] !== undefined) g[f] = s[f];

  g.oldpos = { ...s.oldpos };
  g.delta = { ...s.delta };

  // Monster table
  if (s.monsters) {
    g.monsters = s.monsters.map(m => ({
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
  }

  if (s.s_names) g.s_names = s.s_names;
  if (s.p_colors) g.p_colors = s.p_colors;
  if (s.r_stones) g.r_stones = s.r_stones;
  if (s.ws_made) g.ws_made = s.ws_made;
  if (s.ws_type) g.ws_type = s.ws_type;

  if (s.s_know) g.s_know = s.s_know;
  if (s.p_know) g.p_know = s.p_know;
  if (s.r_know) g.r_know = s.r_know;
  if (s.ws_know) g.ws_know = s.ws_know;
  if (s.s_guess) g.s_guess = s.s_guess;
  if (s.p_guess) g.p_guess = s.p_guess;
  if (s.r_guess) g.r_guess = s.r_guess;
  if (s.ws_guess) g.ws_guess = s.ws_guess;

  if (s.lvl_mons) g.lvl_mons = s.lvl_mons;
  if (s.wand_mons) g.wand_mons = s.wand_mons;

  // Daemon/fuse system
  for (let i = 0; i < s.d_list.length && i < g.d_list.length; i++) {
    const d = s.d_list[i];
    g.d_list[i] = {
      d_type: d.d_type,
      d_func: deserializeDaemonFn(d.d_func),
      d_arg: d.d_arg,
      d_time: d.d_time,
    };
  }

  // Screens
  if (s.stdscr) g.stdscr = deserializeScreen(s.stdscr);
  if (s.cw) g.cw = deserializeScreen(s.cw);
  if (s.mw) g.mw = deserializeScreen(s.mw);

  return true;
}
