# Code Match: Hack 1982 C to JS Correspondence

This document tracks the mapping between the 1982 Hack C source files (`hack-c/upstream/`)
and corresponding JavaScript files (`js/*.js`).

**Status legend**:
- `[ ]` Unstarted — no JS implementation
- `[s]` Stub — function exists but marked `// STUB: not yet ported`
- `[~]` Partial — some logic ported, not complete
- `[p]` Present — fully ported, not yet parity-tested
- `[x]` Complete — passes replay test

---

## rnd.c → js/rng.js

| C function | JS function | Status |
|------------|-------------|--------|
| `rn1(x,y)` | `rn1(x,y)` | `[ ]` |
| `rn2(x)` | `rn2(x)` | `[ ]` |
| `rnd(x)` | `rnd(x)` | `[ ]` |
| `d(n,x)` | `d(n,x)` | `[ ]` |

## hack.main.c → js/main.js

| C function | JS function | Status |
|------------|-------------|--------|
| `main()` | `gameLoop()` | `[ ]` |
| `shufl(base,num)` | `shufl(base,num)` | `[ ]` |
| `alloc(num)` | `alloc(num)` | `[ ]` |
| `losestr(num)` | `losestr(num)` | `[ ]` |
| `getret()` | `getret()` | `[ ]` |
| `glo(foo)` | `glo(foo)` | `[ ]` |

## hack.c → js/hack.js

| C function | JS function | Status |
|------------|-------------|--------|
| `unsee()` | `unsee()` | `[ ]` |
| `seeoff(mode)` | `seeoff(mode)` | `[ ]` |
| `movecm(cmd)` | `movecm(cmd)` | `[ ]` |
| `domove()` | `domove()` | `[ ]` |
| `delmon(mon)` | `delmon(mon)` | `[ ]` |
| `pow(num)` | `pow2(num)` | `[ ]` |
| `tele()` | `tele()` | `[ ]` |
| `doname(obj,buf)` | `doname(obj)` | `[ ]` |
| `parse()` | `parse()` | `[ ]` |

## hack.do.c → js/do.js

| C function | JS function | Status |
|------------|-------------|--------|
| `rhack(cmd)` | `rhack(cmd)` | `[ ]` |
| `doeat()` | `doeat()` | `[ ]` |
| `dodrink()` | `dodrink()` | `[ ]` |
| `doread()` | `doread()` | `[ ]` |
| `dowield()` | `dowield()` | `[ ]` |
| `dowear()` | `dowear()` | `[ ]` |
| `dotakeoff()` | `dotakeoff()` | `[ ]` |
| `doremring()` | `doremring()` | `[ ]` |
| `doputring()` | `doputring()` | `[ ]` |
| `dowave()` | `dowave()` | `[ ]` |
| `dokick()` | `dokick()` | `[ ]` |
| `dolist()` | `dolist()` | `[ ]` |
| `dolook()` | `dolook()` | `[ ]` |
| `dodrop()` | `dodrop()` | `[ ]` |
| `dopickup()` | `dopickup()` | `[ ]` |

## hack.do1.c → js/do1.js

| C function | JS function | Status |
|------------|-------------|--------|
| `ringoff(obj)` | `ringoff(obj)` | `[ ]` |
| `hit(str,mon)` | `hit(str,mon)` | `[ ]` |
| `miss(str,mon)` | `miss(str,mon)` | `[ ]` |
| `findit()` | `findit()` | `[ ]` |
| `bhit(ddx,ddy,range)` | `bhit(ddx,ddy,range)` | `[ ]` |
| `buzz(type,sx,sy,dx,dy)` | `buzz(type,sx,sy,dx,dy)` | `[ ]` |
| `zhit(mon,type)` | `zhit(mon,type)` | `[ ]` |
| `dosearch()` | `dosearch()` | `[ ]` |
| `dosave()` | `dosave()` | `[ ]` |
| `dorecover(fp)` | `dorecover(data)` | `[ ]` |

## hack.mon.c → js/mon.js

| C function | JS function | Status |
|------------|-------------|--------|
| `movemon()` | `movemon()` | `[ ]` |
| `justswld(mtmp)` | `justswld(mtmp)` | `[ ]` |
| `youswld(mtmp,dam,die)` | `youswld(mtmp,dam,die)` | `[ ]` |
| `dochug(mtmp)` | `dochug(mtmp)` | `[ ]` |
| `mhit(name)` | `mhit(name)` | `[ ]` |
| `m_move(mtmp)` | `m_move(mtmp)` | `[ ]` |
| `makemon(pmonst)` | `makemon(pmonst)` | `[ ]` |
| `rloc(mon)` | `rloc(mon)` | `[ ]` |
| `mnexto(mon)` | `mnexto(mon)` | `[ ]` |
| `newcham(mon,pmonst)` | `newcham(mon,pmonst)` | `[ ]` |
| `killed(mtmp)` | `killed(mtmp)` | `[ ]` |
| `attmon(mtmp,otmp,range)` | `attmon(mtmp,otmp,range)` | `[ ]` |
| `amon(mtmp,otmp,range)` | `amon(mtmp,otmp,range)` | `[ ]` |
| `hitu(str,dam,name)` | `hitu(str,dam,name)` | `[ ]` |
| `steal(mon)` | `steal(mon)` | `[ ]` |
| `poisoned(str)` | `poisoned(str)` | `[ ]` |
| `losexp()` | `losexp()` | `[ ]` |
| `losehp(n)` | `losehp(n)` | `[ ]` |
| `g_at(x,y,gen)` | `g_at(x,y,gen)` | `[ ]` |

## hack.pri.c → js/pri.js

| C function | JS function | Status |
|------------|-------------|--------|
| `curs(x,y)` | `curs(x,y)` | `[ ]` |
| `swallowed()` | `swallowed()` | `[ ]` |
| `startup(nam)` | `startup()` | `[ ]` |
| `panic(str,...)` | `panic(str,...args)` | `[ ]` |
| `cls()` | `cls()` | `[ ]` |
| `home()` | `home()` | `[ ]` |
| `atl(x,y,ch)` | `atl(x,y,ch)` | `[ ]` |
| `on(x,y)` | `on(x,y)` | `[ ]` |
| `at(x,y,ch)` | `at(x,y,ch)` | `[ ]` |
| `docrt()` | `docrt()` | `[ ]` |
| `pru()` | `pru()` | `[ ]` |
| `prl(x,y)` | `prl(x,y)` | `[ ]` |
| `newsym(x,y)` | `newsym(x,y)` | `[ ]` |
| `nosee(x,y)` | `nosee(x,y)` | `[ ]` |
| `prl1(x,y)` | `prl1(x,y)` | `[ ]` |
| `nose1(x,y)` | `nose1(x,y)` | `[ ]` |
| `pline(line,...)` | `pline(line,...args)` | `[ ]` |
| `prustr()` | `prustr()` | `[ ]` |
| `pmon(mon)` | `pmon(mon)` | `[ ]` |
| `nscr()` | `nscr()` | `[ ]` |
| `bot()` | `bot()` | `[ ]` |

## hack.lev.c → js/lev.js

| C function | JS function | Status |
|------------|-------------|--------|
| `savelev(fp)` | `savelev()` | `[ ]` |
| `getlev(fp)` | `getlev(data)` | `[ ]` |
| `mklev()` → calls mklev binary | `mklev()` → calls generatelevel() | `[ ]` |
| `mkobj(let)` | `mkobj(let)` | `[ ]` |

## mklev.c → js/mklev.js

| C function | JS function | Status |
|------------|-------------|--------|
| `main(argc,argv)` | `generatelevel(dlevel,seed)` | `[ ]` |
| `mkobj()` | `mkobj_lev()` | `[ ]` |
| `comp(x,y)` | `comp(x,y)` | `[ ]` |
| `mkpos()` | `mkpos()` | `[ ]` |
| `makecor(sx,sy)` | `makecor(nx,ny)` | `[ ]` |
| `maker(lx,hx,ly,hy)` | `maker(lx,hx,ly,hy)` | `[ ]` |
| `mktrap(x,y)` | `mktrap(x,y)` | `[ ]` |
| `mkgold(cnt,x,y)` | `mkgold(cnt,x,y)` | `[ ]` |
| `makemaz()` | `makemaz()` | `[ ]` |
| `makemon()` | `makemon_lev()` | `[ ]` |
| `g_at(x,y,gen)` | `g_at_lev(x,y,gen)` | `[ ]` |
| `savelev()` | `savelev_lev()` | `[ ]` |
| `dodoor(x,y)` | `dodoor(x,y)` | `[ ]` |
| `newloc()` | `newloc()` | `[ ]` |
| `move(x,y,dir)` | `mazMove(x,y,dir)` | `[ ]` |
| `okay(x,y,dir)` | `okay(x,y,dir)` | `[ ]` |
| `mkgold(cnt,x,y)` | `mkgold(cnt,x,y)` | `[ ]` |
| `mkmim(num)` | `mkmim(num)` | `[ ]` |
| `panic(str,...)` | `panic(str,...args)` | `[ ]` |
