# Code Match: Rogue 3.6 C to JS Correspondence

Tracks the mapping between C source (`rogue-c/patched/`) and JavaScript (`js/`).

**Status legend**:
- `[ ]` Unstarted — no JS implementation
- `[s]` Stub — wired up but body is `async () => {}` (no-op)
- `[~]` Partial — some logic ported, known gaps
- `[p]` Present — fully ported, not yet parity-tested
- `[x]` Complete — passes all 34 replay sessions

---

## armor.c → (no dedicated JS file)

C functions live in `command.js` (wired as dep-injected stubs) and `main.js`.

| C function | JS location | Status | Notes |
|------------|-------------|--------|-------|
| `wear()` | command.js | `[s]` | stub: `async () => {}` |
| `take_off()` | command.js | `[s]` | stub: `async () => {}` |
| `waste_time()` | main.js | `[x]` | empty async (correct — just costs a turn) |

---

## chase.c → js/chase.js

| C function | JS function | Status |
|------------|-------------|--------|
| `runners()` | `runners()` | `[x]` |
| `do_chase(th)` | `do_chase(th)` | `[x]` |
| `runto(runner, spot)` | `runto(runner, spot)` | `[x]` |
| `chase(tp, ee)` | `chase(tp, ee)` | `[x]` |
| `cansee(y, x)` | `cansee(y, x)` *(in monsters.js)* | `[x]` |
| `find_mons(y, x)` | `find_mons(y, x)` *(in monsters.js)* | `[x]` |

---

## command.c → js/command.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `command()` | `command()` | `[x]` | |
| `quit()` | `quit()` | `[x]` | |
| `help()` | `help()` | `[x]` | |
| `identify()` | `identify()` | `[x]` | |
| `d_level()` | `d_level()` | `[x]` | |
| `u_level()` | `u_level()` | `[x]` | |
| `search()` | `search()` *(in misc.js)* | `[x]` | |
| `call()` | command.js | `[s]` | stub: `async () => {}` |
| `shell()` | — | `[ ]` | not applicable in browser |

---

## daemon.c → js/daemon.js

| C function | JS function | Status |
|------------|-------------|--------|
| `d_slot()` | internal | `[x]` |
| `find_slot()` | internal | `[x]` |
| `daemon(fn, arg, when)` | `daemon(fn, arg, when)` | `[x]` |
| `kill_daemon(fn)` | `kill_daemon(fn)` | `[x]` |
| `do_daemons(when)` | `do_daemons(when)` | `[x]` |
| `fuse(fn, arg, time, when)` | `fuse(fn, arg, time, when)` | `[x]` |
| `lengthen(fn, xtime)` | `lengthen(fn, xtime)` | `[x]` |
| `extinguish(fn)` | `extinguish(fn)` | `[x]` |
| `do_fuses(when)` | `do_fuses(when)` | `[x]` |

---

## daemons.c → js/daemons.js

| C function | JS function | Status |
|------------|-------------|--------|
| `doctor()` | `doctor()` | `[x]` |
| `swander()` | `swander()` | `[x]` |
| `rollwand()` | `rollwand()` | `[x]` |
| `unconfuse()` | `unconfuse()` | `[x]` |
| `unsee()` | `unsee()` | `[x]` |
| `sight()` | `sight()` | `[x]` |
| `nohaste()` | `nohaste()` | `[x]` |
| `stomach()` | `stomach()` | `[x]` |

---

## fight.c → js/fight.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `fight(mp, mn, weap, thrown)` | `fight(mp, mn, weap, thrown)` | `[x]` | |
| `attack(mp)` | `attack(mp)` | `[x]` | |
| `swing(at_lvl, ac, add)` | `swing(at_lvl, ac, add)` | `[x]` | |
| `check_level()` | `check_level()` | `[x]` | |
| `roll_em(def, att, weap)` | `roll_em(def, att, weap)` | `[x]` | |
| `prname(mn, upper)` | `prname(mn, upper)` | `[x]` | |
| `hit(mn)` | `hit(mn)` | `[x]` | |
| `miss(mn)` | `miss_msg(mn)` | `[x]` | renamed |
| `save_throw(which, who)` | `save_throw(which, who)` | `[x]` | |
| `save(which)` | `save(which)` | `[x]` | |
| `str_plus(str)` | `str_plus(str)` | `[x]` | |
| `raise_level()` | `raise_level()` | `[x]` | |
| `thunk(weap, name)` | `thunk(weap, name)` | `[x]` | |
| `bounce(wh, mn, y, x)` | `bounce(wh, mn, y, x)` | `[x]` | |
| `is_magic(obj)` | `is_magic(obj)` | `[x]` | |
| `killed(item, pr)` | `killed(item, pr)` | `[x]` | |
| `removeM(item)` | `removeM(item)` *(in monsters.js)* | `[x]` | |

---

## init.c → js/init.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `init_player()` | `init_player()` | `[x]` | |
| `init_things()` | `init_things()` | `[x]` | |
| `init_colors()` | `init_colors()` | `[x]` | |
| `init_names()` | `init_names()` | `[x]` | |
| `init_stones()` | `init_stones()` | `[x]` | |
| `init_materials()` | `init_materials()` | `[x]` | |
| `badcheck()` | — | `[ ]` | copy-protection check, not needed |

---

## io.c → js/io.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `msg(...)` | `msg(...)` | `[x]` | |
| `addmsg(str)` | `addmsg(str)` | `[x]` | |
| `endmsg()` | `endmsg()` | `[x]` | |
| `doadd(fmt, ...)` | internal | `[x]` | |
| `step_ok(ch)` | `step_ok(ch)` | `[x]` | |
| `readchar()` | `readchar()` | `[x]` | |
| `status()` | `status()` | `[x]` | |
| `wait_for(ch)` | `wait_for(ch)` | `[x]` | |
| `show_win(message)` | — | `[ ]` | hw overlay display |

---

## list.c → js/list.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `new_item(size)` | `new_item(data)` | `[x]` | |
| `_attach(list, item)` | `_attach(listp, item)` | `[x]` | listp = `{val}` wrapper |
| `_detach(list, item)` | `_detach(listp, item)` | `[x]` | |
| `_free_list(list)` | `_free_list(listp)` | `[x]` | |
| `discard(item)` | `discard(item)` *(in main.js)* | `[x]` | |

---

## main.c → js/main.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `main()` | `startGameState()` + `playit()` | `[x]` | |
| `playit()` | `playit()` | `[x]` | |
| `rnd(range)` | `rnd(range)` *(in rng.js)* | `[x]` | |
| `roll(num, sides)` | `roll(num, sides)` *(in rng.js)* | `[x]` | |
| `endit()` | inline in `fight.js` | `[~]` | graceful exit not wired |
| `fatal(msg)` | — | `[ ]` | not applicable in browser |
| `tstp()` | — | `[ ]` | Unix signal handler, N/A |
| `checkout()` | — | `[ ]` | copy-protection, not needed |
| `too_much()` | — | `[ ]` | load-average check, N/A |
| `loadav()` | — | `[ ]` | Unix-specific, N/A |
| `ucount()` | — | `[ ]` | Unix-specific, N/A |
| `author()` | — | `[ ]` | credits string |

---

## misc.c → js/misc.js

| C function | JS function | Status |
|------------|-------------|--------|
| `tr_name(type)` | `tr_name(type)` | `[x]` |
| `look(wakeup)` | `look(wakeup)` | `[x]` |
| `secretdoor(rp)` | internal | `[x]` |
| `find_obj(y, x)` | `find_obj(y, x)` | `[x]` |
| `eat()` | `eat()` | `[x]` |
| `chg_str(amt)` | `chg_str(amt)` | `[x]` |
| `add_haste(blessed)` | `add_haste(blessed)` | `[x]` |
| `aggravate()` | `aggravate()` | `[x]` |
| `vowelstr(str)` | `vowelstr(str)` *(in things.js)* | `[x]` |
| `is_current(obj)` | `is_current(obj)` | `[x]` |
| `get_dir()` | `get_dir()` | `[x]` |

---

## monsters.c → js/monsters.js

| C function | JS function | Status |
|------------|-------------|--------|
| `randmonster(wander)` | `randmonster(wander)` | `[x]` |
| `new_monster(item, type, cp)` | `new_monster(item, type, cp)` | `[x]` |
| `wanderer()` | `wanderer()` | `[x]` |
| `wake_monster(y, x)` | `wake_monster(y, x)` | `[x]` |
| `genocide()` | `genocide()` | `[x]` |
| `find_mons(y, x)` | `find_mons(y, x)` | `[x]` |
| `removeM(item)` | `removeM(item)` | `[x]` |
| `cansee(y, x)` | `cansee(y, x)` | `[x]` |

---

## move.c → js/move.js

| C function | JS function | Status |
|------------|-------------|--------|
| `do_run(ch)` | `do_run(ch)` | `[x]` |
| `do_move(dy, dx)` | `do_move(dy, dx)` | `[x]` |
| `light(cp)` | `light(cp)` | `[x]` |
| `show(y, x)` | `show(y, x)` | `[x]` |
| `be_trapped(tc)` | `be_trapped(tc)` | `[x]` |
| `trap_at(y, x)` | `trap_at(y, x)` | `[x]` |
| `rndmove(who)` | `rndmove(who)` | `[x]` |
| `diag_ok(sp, ep)` | `diag_ok(sp, ep)` | `[x]` |

---

## newlevel.c → js/newlevel.js

| C function | JS function | Status |
|------------|-------------|--------|
| `new_level()` | `new_level()` | `[x]` |
| `put_things()` | `put_things()` | `[x]` |
| `rnd_room()` | `rnd_room()` *(in rooms.js)* | `[x]` |

---

## options.c → (no JS file)

Options/settings system not ported — not applicable to browser-based play.

| C function | Status |
|------------|--------|
| `option()` | `[ ]` |
| `get_bool()` | `[ ]` |
| `get_str()` | `[ ]` |
| `put_bool()` | `[ ]` |
| `put_str()` | `[ ]` |
| `parse_opts()` | `[ ]` |
| `strucpy()` | `[ ]` |

---

## pack.c → js/pack.js

| C function | JS function | Status |
|------------|-------------|--------|
| `add_pack(item, silent)` | `add_pack(item, silent)` | `[x]` |
| `inventory(list, type)` | `inventory(list, type)` | `[x]` |
| `pick_up(ch)` | `pick_up(ch)` | `[x]` |
| `picky_inven()` | `picky_inven()` | `[x]` |
| `get_item(purpose, type)` | `get_item(purpose, type)` | `[x]` |
| `pack_char(obj)` | `pack_char(obj)` | `[x]` |

---

## passages.c → js/passages.js

| C function | JS function | Status |
|------------|-------------|--------|
| `do_passages()` | `do_passages()` | `[x]` |
| `conn(r1, r2)` | internal | `[x]` |
| `door(rm, pos)` | internal | `[x]` |
| `add_pass(y, x, dir)` | internal | `[x]` |

---

## potions.c → (no JS file)

`quaff()` is dep-injected into `command.js` as a no-op stub. Individual
potion effects not yet ported.

| C function | JS location | Status |
|------------|-------------|--------|
| `quaff()` | command.js | `[s]` |
| *(potion effects)* | — | `[ ]` |

---

## rings.c → (no JS file)

Ring wear/remove dep-injected as stubs. Ring stat effects partially handled
in `daemons.js` (ISRING checks during stomach/doctor).

| C function | JS location | Status | Notes |
|------------|-------------|--------|-------|
| `ring_on()` | command.js | `[s]` | stub |
| `ring_off()` | command.js | `[s]` | stub |
| `gethand()` | — | `[ ]` | hand-selection prompt |
| `ring_eat()` | daemons.js | `[~]` | hunger effects via ISRING checks |

---

## rip.c → (no JS file)

End-of-game screen not fully implemented.

| C function | JS location | Status | Notes |
|------------|-------------|--------|-------|
| `death(monst)` | fight.js dep-injection | `[~]` | sets `g.playing=false`, no RIP screen |
| `score()` | — | `[ ]` | high-score list |
| `total_winner()` | — | `[ ]` | winning end screen |
| `killname()` | — | `[ ]` | cause-of-death string |

---

## rooms.c → js/rooms.js

| C function | JS function | Status |
|------------|-------------|--------|
| `do_rooms()` | `do_rooms()` | `[x]` |
| `draw_room(rp)` | `draw_room(rp)` | `[x]` |
| `horiz(rp, r, ch)` | `horiz(rp, r, ch)` | `[x]` |
| `vert(rp, c, ch)` | `vert(rp, c, ch)` | `[x]` |
| `rnd_pos(rp, cp)` | `rnd_pos(rp, cp)` | `[x]` |
| `rnd_room()` | `rnd_room()` | `[x]` |
| `roomin(cp)` | `roomin(cp)` | `[x]` |

---

## save.c → (no JS file)

Save/restore not implemented — browser sessions are ephemeral.

| C function | Status |
|------------|--------|
| `save_game()` | `[ ]` |
| `auto_save()` | `[ ]` |
| `save_file()` | `[ ]` |
| `restore()` | `[ ]` |
| `encwrite()` | `[ ]` |
| `encread()` | `[ ]` |

---

## scrolls.c → (no JS file)

`read_scroll()` wired as no-op stub. See [issue #271](https://github.com/davidbau/menace/issues/271).

| C function | JS location | Status |
|------------|-------------|--------|
| `read_scroll()` | command.js | `[s]` |
| *(scroll effects)* | — | `[ ]` |

---

## sticks.c → js/sticks.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `fix_stick(cur)` | `fix_stick(cur)` | `[x]` | |
| `do_zap()` | command.js | `[s]` | stub |
| `drain()` | — | `[ ]` | wand charge drain on hit |

---

## things.c → js/things.js

| C function | JS function | Status |
|------------|-------------|--------|
| `inv_name(obj, drop)` | `inv_name(obj, drop)` | `[x]` |
| `money()` | `money()` | `[x]` |
| `drop()` | `drop()` | `[x]` |
| `dropcheck(op)` | `dropcheck(op)` | `[x]` |
| `new_thing()` | `new_thing()` | `[x]` |
| `pick_one(magic, nitems)` | `pick_one(magic, nitems)` | `[x]` |

---

## weapons.c → js/weapons.js

| C function | JS function | Status |
|------------|-------------|--------|
| `missile(ydelta, xdelta)` | `missile(ydelta, xdelta)` | `[x]` |
| `do_motion(obj, dy, dx)` | `do_motion(obj, dy, dx)` | `[x]` |
| `fall(obj, print)` | `fall(obj, print)` | `[x]` |
| `init_weapon(weap, which)` | `init_weapon(weap, which)` | `[x]` |
| `hit_monster(y, x, obj)` | `hit_monster(y, x, obj)` | `[x]` |
| `num(n1, n2)` | `num(n1, n2)` | `[x]` |
| `wield()` | `wield()` | `[x]` |
| `fallpos(pos, npos)` | `fallpos(pos, npos)` | `[x]` |
| `newgrp()` | `newgrp()` | `[x]` |

---

## wizard.c → (no JS file)

Wizard mode not implemented.

| C function | JS location | Status | Notes |
|------------|-------------|--------|-------|
| `teleport()` | main.js | `[x]` | general teleport, not wizard-specific |
| `whatis()` | — | `[ ]` | identify-by-pointing |
| `create_obj()` | — | `[ ]` | wish/create item |
| `passwd()` | — | `[ ]` | wizard mode password |

---

## Summary

| File | Status |
|------|--------|
| `armor.c` | `[s]` wear/take_off stubbed |
| `chase.c` | `[x]` complete |
| `command.c` | `[x]` complete (shell/call stubbed, not needed) |
| `daemon.c` | `[x]` complete |
| `daemons.c` | `[x]` complete |
| `fight.c` | `[x]` complete |
| `init.c` | `[x]` complete |
| `io.c` | `[x]` complete (show_win missing) |
| `list.c` | `[x]` complete |
| `main.c` | `[x]` gameplay complete; Unix-specific helpers N/A |
| `misc.c` | `[x]` complete |
| `monsters.c` | `[x]` complete |
| `move.c` | `[x]` complete |
| `newlevel.c` | `[x]` complete |
| `options.c` | `[ ]` not applicable in browser |
| `pack.c` | `[x]` complete |
| `passages.c` | `[x]` complete |
| `potions.c` | `[s]` quaff stubbed |
| `rings.c` | `[s]` ring_on/ring_off stubbed |
| `rip.c` | `[~]` death sets flag; no RIP screen |
| `rooms.c` | `[x]` complete |
| `save.c` | `[ ]` not applicable in browser |
| `scrolls.c` | `[s]` read_scroll stubbed (issue #271) |
| `sticks.c` | `[s]` do_zap stubbed |
| `things.c` | `[x]` complete |
| `weapons.c` | `[x]` complete |
| `wizard.c` | `[ ]` wizard mode not implemented |
