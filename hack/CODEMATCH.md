# Code Match: Hack 1982 C to JS Correspondence

This document tracks the mapping between the 1982 Hack C source files (`hack-c/upstream/`)
and corresponding JavaScript files (`js/*.js`).

**Status legend**:
- `[ ]` Unstarted — no JS implementation
- `[s]` Stub — function exists but is empty or a no-op placeholder
- `[~]` Partial — some logic ported, not complete or defers to another module
- `[p]` Present — fully ported, not yet parity-tested
- `[x]` Complete — passes replay test (22/22 sessions, 100% screen parity)

All 22 sessions pass with 100% screen parity (step-0 RNG 483/483). Step 4+ RNG
divergence is a known open issue under investigation.

---

## rnd.c → js/rng.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `rn1(x,y)` | `rn1(x,y)` | `[x]` | |
| `rn2(x)` | `rn2(x)` | `[x]` | |
| `rnd(x)` | `rnd(x)` | `[x]` | |
| `d(n,x)` | `d(n,x)` | `[x]` | dice sum |
| _(internal)_ | `seedRng(seed)` | `[x]` | 32-bit LCG, sets initial state |
| _(internal)_ | `logEvent(tag)` | `[x]` | event logging inline in RNG stream |

---

## hack.main.c → js/main.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `main()` | `gameLoop(seed)` | `[x]` | full init + monster/hunger/regen loop |
| `shufl(base,num)` | `shufl(base,num)` | `[x]` | Fisher-Yates shuffle |
| `alloc(num)` | `alloc()` | `[x]` | trivial in JS (plain object) |
| `losestr(num)` | `losestr(num)` | `[x]` | |
| `getret()` | `getret()` | `[x]` | async, waits for space/return |
| `glo(foo)` | `glo(foo)` | `[x]` | lock file suffix |
| _(inlined)_ | `lesshungry(n)` | `[x]` | food hunger reduction |
| _(inlined)_ | `useup(obj)` | `[x]` | consume one item or reduce charges |
| `done(reason)` | `done(reason)` | `[x]` | throws GameOver |
| _(in hack.do.c)_ | `dodown()` | `[x]` | descend stairs |
| _(in hack.do.c)_ | `doup()` | `[x]` | ascend stairs, escape check |
| _(in hack.do.c)_ | `done1()` | `[x]` | quit handler with confirmation |

---

## hack.c → js/hack.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `unsee()` | `unsee()` | `[x]` | |
| `setsee()` | `setsee()` | `[~]` | blind handling incomplete (STUB comment line 18) |
| `seeoff(mode)` | `seeoff(mode)` | `[x]` | |
| `movecm(cmd)` | `movecm(cmd)` | `[x]` | 8-directional + Rogue key mapping |
| `domove()` | `domove()` | `[x]` | movement with traps, monsters, items, stairs, blindness |
| `pow(num)` | `pow2(num)` | `[x]` | renamed to avoid shadowing Math.pow |
| `tele()` | `tele()` | `[x]` | teleport with validation loop |
| `doname(obj,buf)` | `doname(obj)` | `[x]` | item naming for all object types |
| `parse()` | `parse()` | `[x]` | command input with screen capture timing |
| `nomul(n)` | `nomul(n)` | `[x]` | reset multi-move counter |
| `abon()` | `abon()` | `[x]` | strength bonus to-hit |
| `amon(mtmp,obj,range)` | `amon(mtmp,obj,range)` | `[x]` | player melee attack with damage |
| `attmon(mtmp,obj,range)` | `attmon(mtmp,obj,range)` | `[x]` | apply hit/damage after amon |
| `weight(obj)` | `weight(obj)` | `[x]` | item weight |
| `prinv(obj)` | `prinv(obj)` | `[x]` | print inventory line |
| `gobj(obj)` | `gobj(obj)` | `[x]` | pick up object with stacking |
| `setan(str)` | `setan(str)` | `[x]` | article helper (a/an) |

---

## hack.do.c → js/do.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `rhack(cmd)` | `rhack(cmd)` | `[x]` | command dispatcher: 30+ commands |
| `doeat()` | `doeat()` | `[x]` | eat food; calls lesshungry |
| `dodrink()` | `dodrink()` | `[x]` | 15 potion types with effects |
| `doread()` | `doread()` | `[x]` | 11 scroll types with effects |
| `dowield()` | `dowield()` | `[x]` | wield weapon |
| `dowear()` | `dowear()` | `[x]` | wear armor |
| `dotakeoff()` | `dotakeoff()` | `[x]` | remove armor |
| `doremring()` | `doremring()` | `[x]` | remove ring |
| `doputring()` | `doputring()` | `[x]` | put on ring; 16 ring effects |
| `dowave()` | `dowave()` | `[x]` | zap/wave wand (directional) |
| `dokick()` | `dokick()` | `[x]` | kick object or monster |
| `dolist()` | `dolist()` | `[x]` | list inventory |
| `dolook()` | `dolook()` | `[x]` | look at item on floor |
| `dodrop()` | `dodrop()` | `[x]` | drop item |
| `dopickup()` | `dopickup()` | `[x]` | pick up item |
| `getobj(filter,verb)` | `getobj(filter,verb)` | `[x]` | inventory selection prompt |
| `doinv(filter)` | `doinv(filter)` | `[x]` | display inventory list |
| `getdir()` | `getdir()` | `[x]` | direction prompt (h/j/k/l/y/u/b/n/.) |
| `getlin()` | `getlin()` | `[x]` | line input with backspace/esc |
| `docall(obj)` | `docall(obj)` | `[x]` | name/call an item |
| `litroom()` | `litroom()` | `[x]` | wand of light effect |
| `rescham()` | `rescham()` | `[s]` | no-op stub (shapechanger restoration) |
| `applyRingOn(otmp)` | `applyRingOn(otmp)` | `[x]` | ring activation side effects |
| `loseone(obj,tdx,tdy)` | `loseone(obj,tdx,tdy)` | `[x]` | throw/fire one item |
| `dodr1(obj)` | `dodr1(obj)` | `[x]` | drop one item |

---

## hack.do1.c → js/do1.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `ringoff(obj)` | `ringoff(obj)` | `[x]` | deactivate ring; strength rings handled specially |
| `hit(str,mon)` | `hit(str,mon)` | `[x]` | display hit message |
| `miss(str,mon)` | `miss(str,mon)` | `[x]` | display miss message |
| `findit()` | `findit()` | `[x]` | detect secret doors/traps; spawns mimics |
| `bhit(ddx,ddy,range)` | `bhit(ddx,ddy,range)` | `[x]` | projectile path with termination |
| `buzz(type,sx,sy,dx,dy)` | `buzz(type,sx,sy,dx,dy)` | `[x]` | 5 ray types: missile/fire/sleep/cold/death |
| `at_buzz(x,y,ch)` | `at_buzz(x,y,ch)` | `[x]` | ray animation helper |
| `zhit(mon,type)` | `zhit(mon,type)` | `[x]` | ray damage per monster type |
| `dosearch()` | `dosearch()` | `[x]` | search adjacent cells for traps/doors |
| `dosave()` | `dosave()` | `[x]` | save to localStorage |
| `dorecover(fp)` | `dorecover(data)` | `[s]` | stub: prints "not yet implemented" (Phase 5) |

---

## hack.mon.c → js/mon.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `movemon()` | `movemon()` | `[x]` | move all monsters with speed checks |
| `justswld(mtmp)` | `justswld(mtmp)` | `[x]` | monster swallows player |
| `youswld(mtmp,dam,die)` | `youswld(mtmp,dam,die)` | `[x]` | player takes swallow damage |
| `dochug(mtmp)` | `dochug(mtmp)` | `[x]` | monster action: 25+ monster-type special abilities |
| `mhit(name)` | `mhit(name)` | `[x]` | monster hit message with multiplicity |
| `m_move(mtmp)` | `m_move(mtmp)` | `[x]` | monster AI: direction toward player, confusion, door avoidance |
| `makemon(pmonst)` | `makemon(pmonst)` | `[x]` | create monster with HP/invisible/shapechanger logic |
| `rloc(mon)` | `rloc(mon)` | `[x]` | relocate monster randomly |
| `mnexto(mon)` | `mnexto(mon)` | `[x]` | move monster adjacent to player |
| `newcham(mon,pmonst)` | `newcham(mon,pmonst)` | `[x]` | change monster form (shapechanger) |
| `killed(mtmp)` | `killed(mtmp)` | `[x]` | monster death: XP award and level-up |
| `attmon(mtmp,otmp,range)` | `attmon(mtmp,otmp,range)` | `[~]` | defers to hack.js amon() via _amon ref |
| `amon(mtmp,otmp,range)` | `amon(mtmp,otmp,range)` | `[~]` | defers via _amon function reference |
| `hitu(str,dam,name)` | `hitu(mlev,dam,name)` | `[x]` | monster hits player with AC calculation |
| `steal(mon)` | `steal(mon)` | `[x]` | monster steals item from inventory |
| `poisoned(str)` | `poisoned(str)` | `[x]` | poison: damage or strength loss |
| `losexp()` | `losexp()` | `[x]` | lose one experience level |
| `losehp(n)` | `losehp(n)` | `[x]` | take hit point damage |
| `g_at(x,y,gen)` | `g_at(x,y,gen)` | `[x]` | generic list search by position |
| `delmon(mtmp)` | `delmon(mtmp)` | `[x]` | remove monster from list |
| `pmon(mon)` | `pmon(mon)` | `[x]` | draw monster on screen |

---

## hack.pri.c → js/pri.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `curs(x,y)` | `curs(x,y)` | `[x]` | cursor move with caching |
| `swallowed()` | `swallowed()` | `[x]` | draw swallow ASCII animation |
| `startup(nam)` | `startup()` | `[x]` | initialize display and player |
| `cls()` | `cls()` | `[x]` | clear screen |
| `home()` | `home()` | `[x]` | cursor to row 1, col 1 |
| `atl(x,y,ch)` | `atl(x,y,ch)` | `[x]` | set map cell + mark dirty |
| `on(x,y)` | `on(x,y)` | `[x]` | mark dirty region |
| `at(x,y,ch)` | `at(x,y,ch)` | `[x]` | put char on screen at map position |
| `docrt()` | `docrt()` | `[x]` | full screen redraw |
| `pru()` | `pru()` | `[x]` | draw player '@' with invisibility check |
| `prl(x,y)` | `prl(x,y)` | `[x]` | draw one cell with monster check |
| `newsym(x,y)` | `newsym(x,y)` | `[x]` | compute correct symbol: items/gold/traps/stairs/walls/doors |
| `nosee(x,y)` | `nosee(x,y)` | `[x]` | hide cell, handle monster/light state |
| `prl1(x,y)` | `prl1(x,y)` | `[x]` | draw cells in movement direction (diagonal expansion) |
| `nose1(x,y)` | `nose1(x,y)` | `[x]` | hide cells in opposite direction |
| `pline(line,...)` | `pline(line,...args)` | `[x]` | display message line |
| `prustr()` | `prustr()` | `[x]` | print strength with 18/xx format |
| `pmon(mon)` | `pmon(mon)` | `[x]` | draw monster if visible |
| `nscr()` | `nscr()` | `[x]` | update dirty screen region |
| `bot()` | `bot()` | `[x]` | redraw status line with all bit-field stats |
| _(internal)_ | `panic(str,...args)` | `[x]` | abort with message |

---

## hack.lev.c → js/lev.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `savelev(fp)` | `savelev()` | `[x]` | serialize level snapshot (JSON) |
| `getlev(fp)` | `getlev(data)` | `[x]` | restore level; regenerates monsters by time |
| `mklev()` → calls mklev binary | `mklev()` | `[x]` | wraps generatelevel, re-seeds RNG |
| `mkobj(let)` | `mkobj(let_char)` | `[x]` | create random item for level |

---

## mklev.c → js/mklev.js

| C function | JS function | Status | Notes |
|------------|-------------|--------|-------|
| `main(argc,argv)` | `generatelevel(dlevel)` | `[x]` | full dungeon generator entry point |
| `mkobj()` | `mkobj_lev()` | `[x]` | item creation for level (13 types) |
| `comp(x,y)` | `comp(a,b)` | `[x]` | room sort by lx, then ly |
| `mkpos()` | `mkpos()` | `[x]` | set corridor direction room→room |
| `makecor(sx,sy)` | `makecor(nx,ny)` | `[x]` | recursive corridor generation |
| `maker(lx,hx,ly,hy)` | `maker(lx,hx,ly,hy)` | `[x]` | create rectangular room with walls/floor |
| `mktrap(x,y)` | `mktrap(x,y)` | `[x]` | place trap or mimic |
| `mkgold(cnt,x,y)` | `mkgold(cnt,x,y)` | `[x]` | place gold |
| `makemaz()` | `makemaz()` | `[x]` | depth-first maze generation with stack |
| `makemon()` | `makemon_lev()` | `[x]` | create sleeping monster for level |
| `g_at(x,y,gen)` | `g_at_lev(x,y,gen)` | `[x]` | trap/gold search in level generation |
| `dodoor(x,y)` | `dodoor(x,y)` | `[x]` | place door or secret door |
| `newloc()` | `newloc()` | `[x]` | pick next corridor endpoint |
| `move(x,y,dir)` | `mazMove(x,y,dir)` | `[x]` | move point in maze grid |
| `okay(x,y,dir)` | `okay(x,y,dir)` | `[x]` | maze direction validity check |
| `mkgold(cnt,x,y)` | `mkgold(cnt,x,y)` | `[x]` | (same as above, called from two sites) |
| `mkmim(num)` | `mkmim(num)` | `[x]` | create mimic with position logic |
| _(internal)_ | `panic(str,...args)` | `[x]` | retry with modified seed (throws MklevRetry) |

---

## Summary

| C file | JS file | Functions | Stubs | Status |
|--------|---------|-----------|-------|--------|
| `rnd.c` | `rng.js` | 4 | 0 | Complete |
| `hack.main.c` | `main.js` | 12 | 0 | Complete |
| `hack.c` | `hack.js` | 17 | 1 (setsee blind) | Near-complete |
| `hack.do.c` | `do.js` | 25 | 1 (rescham) | Near-complete |
| `hack.do1.c` | `do1.js` | 11 | 1 (dorecover) | Near-complete |
| `hack.mon.c` | `mon.js` | 21 | 0 | Complete |
| `hack.pri.c` | `pri.js` | 21 | 0 | Complete |
| `hack.lev.c` | `lev.js` | 4 | 0 | Complete |
| `mklev.c` | `mklev.js` | 18 | 0 | Complete |

**Not applicable** (browser game replaces these):
- `hack.term.c` / terminal I/O — handled by `display.js` + `input.js`
- `hack.save.c` / file save — `dosave()` uses localStorage; `dorecover()` stubbed
- Signal handlers, `setuid`, `getpwuid` — not applicable in browser

**Parity status** (as of Phase 4):
- 22/22 sessions pass at 100% screen parity
- Step-0 RNG: 483/483 match (perfect)
- Step 4+ RNG divergence: under investigation
