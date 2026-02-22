// mon.js -- Monster lifecycle and position management
// C ref: mon.c — movemon(), mfndpos(), corpse_chance(), passivemm(),
// restrap/hider premove, mm_aggression, zombie_maker
//
// INCOMPLETE / MISSING vs C mon.c:
// - No xkilled/monkilled/mondied (monster death processing)
// - No mcalcmove (speed-based movement budget)
// - No grow_up/mon_adjust_speed
// - No mpickstuff/mpickgold (full item pickup logic — stub in monmove.js)
// - No minliquid (monsters falling in pools/lava)
// - mfndpos: no ALLOW_DIG for tunneling monsters with picks
// - mfndpos: no ALLOW_SANCT for temple sanctuary
// - passivemm: only AD_ACID/AD_ENCH/generic modeled; many passive types missing
// - handleHiderPremove: no mimic furniture/object appearance selection

import { COLNO, ROWNO, IS_DOOR, IS_POOL, IS_LAVA, IS_OBSTRUCTED, ACCESSIBLE,
         POOL, ROOM, WATER, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN,
         SHOPBASE, ROOMOFFSET, NORMAL_SPEED, isok } from './config.js';
import { rn2, rnd } from './rng.js';
import { BOULDER, SCR_SCARE_MONSTER } from './objects.js';
import { couldsee, m_cansee } from './vision.js';
import { is_hider, hides_under, is_mindless, is_displacer, perceives,
         is_human, is_elf, is_dwarf, is_gnome, is_orc, is_shapeshifter,
         mon_knows_traps, passes_bars,
         is_golem, is_rider, is_mplayer } from './mondata.js';
import { PM_GRID_BUG, PM_FIRE_ELEMENTAL, PM_SALAMANDER,
         PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER,
         PM_GHOUL, PM_SKELETON,
         PM_DEATH, PM_PESTILENCE, PM_FAMINE,
         PM_LIZARD, PM_VLAD_THE_IMPALER,
         PM_DISPLACER_BEAST,
         PM_KOBOLD, PM_DWARF, PM_GNOME, PM_ORC, PM_ELF, PM_HUMAN,
         PM_GIANT, PM_ETTIN, PM_VAMPIRE, PM_VAMPIRE_LEADER,
         PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE,
         PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE,
         PM_KOBOLD_MUMMY, PM_DWARF_MUMMY, PM_GNOME_MUMMY, PM_ORC_MUMMY,
         PM_ELF_MUMMY, PM_HUMAN_MUMMY, PM_GIANT_MUMMY, PM_ETTIN_MUMMY,
         PM_STUDENT, PM_CHIEFTAIN, PM_NEANDERTHAL, PM_ATTENDANT,
         PM_PAGE, PM_ABBOT, PM_ACOLYTE, PM_HUNTER, PM_THUG,
         PM_ROSHI, PM_GUIDE, PM_WARRIOR, PM_APPRENTICE,
         PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
         PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE,
         PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
         NON_PM, NUMMONS,
         mons,
         AT_NONE, AT_BOOM, AD_PHYS, AD_ACID, AD_ENCH,
         M1_FLY, M1_SWIM, M1_AMPHIBIOUS, M1_AMORPHOUS, M1_WALLWALK,
         M1_TUNNEL, M1_NEEDPICK,
         M1_SLITHY, M1_UNSOLID,
         MZ_TINY, MZ_MEDIUM, MZ_LARGE,
         MR_FIRE, MR_SLEEP, G_FREQ, G_NOCORPSE, G_UNIQ,
         S_EYE, S_LIGHT, S_EEL, S_PIERCER, S_MIMIC,
         S_ZOMBIE, S_LICH, S_KOBOLD, S_ORC, S_GIANT, S_HUMANOID, S_GNOME, S_KOP,
         S_DOG, S_NYMPH, S_LEPRECHAUN, S_HUMAN } from './monsters.js';
import { PIT, SPIKED_PIT, HOLE } from './symbols.js';
import { m_harmless_trap } from './trap.js';
import { dist2, monnear,
         monmoveTrace, monmoveStepLabel,
         canSpotMonsterForMap, BOLT_LIM } from './monutil.js';

// ========================================================================
// onscary — C ref: mon.c onscary()
// ========================================================================
export function onscary(map, x, y) {
    for (const obj of map.objects) {
        if (obj.buried) continue;
        if (obj.ox === x && obj.oy === y
            && obj.otyp === SCR_SCARE_MONSTER
            && !obj.cursed) {
            return true;
        }
    }
    for (const engr of map.engravings || []) {
        if (!engr || engr.x !== x || engr.y !== y) continue;
        if (/elbereth/i.test(String(engr.text || ''))) return true;
    }
    return false;
}

// ========================================================================
// mm_aggression — C ref: mon.c
// ========================================================================
function zombie_form_exists(mdat) {
    const mlet = mdat?.symbol ?? -1;
    switch (mlet) {
    case S_KOBOLD:
    case S_ORC:
    case S_GIANT:
    case S_HUMAN:
    case S_KOP:
    case S_GNOME:
        return true;
    case S_HUMANOID:
        return is_dwarf(mdat);
    default:
        return false;
    }
}

// C ref: mon.c zombie_maker(mon) — returns true if mon can create zombies
export function zombie_maker(mon) {
    if (!mon || mon.mcan) return false;
    const mlet = mon.type?.symbol ?? -1;
    if (mlet === S_ZOMBIE) {
        return mon.mndx !== PM_GHOUL && mon.mndx !== PM_SKELETON;
    }
    return mlet === S_LICH;
}

// C ref: mon.c zombie_form(pm) — return PM index of zombie form, or NON_PM
// Note: C uses ptr comparison; JS uses symbol and flag predicates.
export function zombie_form(pm) {
    if (!pm) return NON_PM;
    switch (pm.symbol) {
    case S_ZOMBIE:
        return NON_PM; // already a zombie/ghoul/skeleton
    case S_KOBOLD:
        return PM_KOBOLD_ZOMBIE;
    case S_ORC:
        return PM_ORC_ZOMBIE;
    case S_GIANT:
        if (pm === mons[PM_ETTIN]) return PM_ETTIN_ZOMBIE;
        return PM_GIANT_ZOMBIE;
    case S_HUMAN:
    case S_KOP:
        if (is_elf(pm)) return PM_ELF_ZOMBIE;
        return PM_HUMAN_ZOMBIE;
    case S_HUMANOID:
        if (is_dwarf(pm)) return PM_DWARF_ZOMBIE;
        break;
    case S_GNOME:
        return PM_GNOME_ZOMBIE;
    }
    return NON_PM;
}

// C ref: mon.c undead_to_corpse(mndx) — convert undead PM index to living counterpart
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case PM_KOBOLD_ZOMBIE: case PM_KOBOLD_MUMMY: return PM_KOBOLD;
    case PM_DWARF_ZOMBIE:  case PM_DWARF_MUMMY:  return PM_DWARF;
    case PM_GNOME_ZOMBIE:  case PM_GNOME_MUMMY:  return PM_GNOME;
    case PM_ORC_ZOMBIE:    case PM_ORC_MUMMY:    return PM_ORC;
    case PM_ELF_ZOMBIE:    case PM_ELF_MUMMY:    return PM_ELF;
    case PM_VAMPIRE: case PM_VAMPIRE_LEADER:
    case PM_HUMAN_ZOMBIE:  case PM_HUMAN_MUMMY:  return PM_HUMAN;
    case PM_GIANT_ZOMBIE:  case PM_GIANT_MUMMY:  return PM_GIANT;
    case PM_ETTIN_ZOMBIE:  case PM_ETTIN_MUMMY:  return PM_ETTIN;
    default: return mndx;
    }
}

// C ref: mon.c genus(mndx, mode) — return generic species index for a monster.
// mode=0: return base species (PM_HUMAN, PM_ELF, etc.)
// mode=1: return character-class monster (PM_ARCHEOLOGIST, etc.) for quest guardians
export function genus(mndx, mode) {
    switch (mndx) {
    case PM_STUDENT:     return mode ? PM_ARCHEOLOGIST : PM_HUMAN;
    case PM_CHIEFTAIN:   return mode ? PM_BARBARIAN   : PM_HUMAN;
    case PM_NEANDERTHAL: return mode ? PM_CAVE_DWELLER: PM_HUMAN;
    case PM_ATTENDANT:   return mode ? PM_HEALER      : PM_HUMAN;
    case PM_PAGE:        return mode ? PM_KNIGHT       : PM_HUMAN;
    case PM_ABBOT:       return mode ? PM_MONK         : PM_HUMAN;
    case PM_ACOLYTE:     return mode ? PM_CLERIC       : PM_HUMAN;
    case PM_HUNTER:      return mode ? PM_RANGER       : PM_HUMAN;
    case PM_THUG:        return mode ? PM_ROGUE        : PM_HUMAN;
    case PM_ROSHI:       return mode ? PM_SAMURAI      : PM_HUMAN;
    case PM_GUIDE:       return mode ? PM_TOURIST      : PM_HUMAN;
    case PM_APPRENTICE:  return mode ? PM_WIZARD       : PM_HUMAN;
    case PM_WARRIOR:     return mode ? PM_VALKYRIE     : PM_HUMAN;
    default:
        if (mndx >= 0 && mndx < NUMMONS) {
            const ptr = mons[mndx];
            if (is_human(ptr)) return PM_HUMAN;
            if (is_elf(ptr))   return PM_ELF;
            if (is_dwarf(ptr)) return PM_DWARF;
            if (is_gnome(ptr)) return PM_GNOME;
            if (is_orc(ptr))   return PM_ORC;
        }
        return mndx;
    }
}

// C ref: mon.c pm_to_cham(mndx) — return mndx if shapeshifter, else NON_PM
export function pm_to_cham(mndx) {
    if (mndx >= 0 && mndx < NUMMONS && is_shapeshifter(mons[mndx]))
        return mndx;
    return NON_PM;
}

function unique_corpstat(mdat) {
    return !!((mdat?.geno || 0) & G_UNIQ);
}

function mm_2way_aggression(magr, mdef, map) {
    if (!zombie_maker(magr)) return { allowM: false, allowTM: false };
    if (!zombie_form_exists(mdef?.type || {})) return { allowM: false, allowTM: false };
    const inStronghold = map?.flags?.graveyard && map?.flags?.is_maze_lev;
    if (inStronghold) return { allowM: false, allowTM: false };
    if (unique_corpstat(magr?.type || {}) || unique_corpstat(mdef?.type || {})) {
        return { allowM: false, allowTM: false };
    }
    return { allowM: true, allowTM: true };
}

function mm_aggression(magr, mdef, map) {
    if (magr?.tame && mdef?.tame) return { allowM: false, allowTM: false };
    const attackerIdx = magr?.mndx;
    const defenderIdx = mdef?.mndx;
    const isPurpleWorm = attackerIdx === PM_PURPLE_WORM || attackerIdx === PM_BABY_PURPLE_WORM;
    if (isPurpleWorm && defenderIdx === PM_SHRIEKER) return { allowM: true, allowTM: true };

    const ab = mm_2way_aggression(magr, mdef, map);
    const ba = mm_2way_aggression(mdef, magr, map);
    return {
        allowM: ab.allowM || ba.allowM,
        allowTM: ab.allowTM || ba.allowTM,
    };
}

// ========================================================================
// mfndpos — C ref: mon.c mfndpos()
// ========================================================================
// C ref: hack.c bad_rock() / cant_squeeze_thru() subset used by mon.c mfndpos().
function bad_rock_for_mon(mon, map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return true;
    if (!IS_OBSTRUCTED(loc.typ)) return false;
    const f1 = mon.type?.flags1 || 0;
    const canPassWall = !!(f1 & M1_WALLWALK);
    if (canPassWall) return false;
    const canTunnel = !!(f1 & M1_TUNNEL);
    const needsPick = !!(f1 & M1_NEEDPICK);
    if (canTunnel && !needsPick) return false;
    return true;
}

function cant_squeeze_thru_mon(mon) {
    const ptr = mon.type || {};
    const f1 = ptr.flags1 || 0;
    if (f1 & M1_WALLWALK) return false;
    const size = ptr.size || 0;
    const canMorph = !!(f1 & (M1_AMORPHOUS | M1_UNSOLID | M1_SLITHY));
    if (size > MZ_MEDIUM && !canMorph) return true;
    const load = Array.isArray(mon.minvent)
        ? mon.minvent.reduce((a, o) => a + (o?.owt || 0), 0)
        : 0;
    return load > 600;
}

export function mfndpos(mon, map, player, opts = {}) {
    const isRider = (m) => m?.mndx === PM_DEATH || m?.mndx === PM_PESTILENCE || m?.mndx === PM_FAMINE;
    const monLevel = (m) => Number.isInteger(m?.m_lev) ? m.m_lev
        : (Number.isInteger(m?.mlevel) ? m.mlevel
            : (Number.isInteger(m?.type?.level) ? m.type.level : 0));
    const allowDoorOpen = !!opts.allowDoorOpen;
    const allowDoorUnlock = !!opts.allowDoorUnlock;
    const omx = mon.mx, omy = mon.my;
    const nodiag = (mon.mndx === PM_GRID_BUG);
    const mflags1 = mon.type?.flags1 || 0;
    const mdat = mon.type || {};
    const mlet = mdat.symbol ?? -1;
    const isFlyer = !!(mflags1 & M1_FLY);
    const isFloater = (mlet === S_EYE || mlet === S_LIGHT);
    const m_in_air = isFlyer || isFloater;
    const wantpool = (mlet === S_EEL);
    const isSwimmer = !!(mflags1 & (M1_SWIM | M1_AMPHIBIOUS));
    const poolok = (m_in_air || (isSwimmer && !wantpool));
    const likesLava = (mon.mndx === PM_FIRE_ELEMENTAL || mon.mndx === PM_SALAMANDER);
    const lavaok = (m_in_air && !isFloater) || likesLava;
    const canPassWall = !!(mflags1 & M1_WALLWALK);
    const thrudoor = canPassWall;
    const allowBars = passes_bars(mdat);
    const isAmorphous = !!(mflags1 & M1_AMORPHOUS);
    const allowM = !!mon.tame;
    const allowSSM = !!(mon.tame || mon.peaceful || mon.isshk || mon.ispriest);
    const positions = [];
    const maxx = Math.min(omx + 1, COLNO - 1);
    const maxy = Math.min(omy + 1, ROWNO - 1);

    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (nx !== omx && ny !== omy && nodiag) continue;

            const loc = map.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;

            if (ntyp < POOL) {
                if (!canPassWall) continue;
            }
            if (ntyp === WATER && !isSwimmer) continue;
            if (ntyp === IRONBARS && !allowBars) continue;
            if (IS_DOOR(ntyp)
                && !(isAmorphous && !mon.engulfing)
                && (((loc.flags & D_CLOSED) && !allowDoorOpen)
                    || ((loc.flags & D_LOCKED) && !allowDoorUnlock))
                && !thrudoor) continue;
            if (ntyp === LAVAWALL && !lavaok) continue;
            if (!poolok && IS_POOL(ntyp) !== wantpool) continue;
            if (!lavaok && IS_LAVA(ntyp)) continue;

            if (nx !== omx && ny !== omy) {
                const monLoc = map.at(omx, omy);
                if ((IS_DOOR(ntyp) && (loc.flags & ~D_BROKEN))
                    || (monLoc && IS_DOOR(monLoc.typ) && (monLoc.flags & ~D_BROKEN)))
                    continue;
            }

            const monAtPos = map.monsterAt(nx, ny);
            let allowMAttack = false;
            let allowMDisp = false;
            if (monAtPos && !monAtPos.dead) {
                if (allowM) {
                    allowMAttack = !monAtPos.tame && !monAtPos.peaceful;
                } else {
                    const mmflag = mm_aggression(mon, monAtPos, map);
                    allowMAttack = mmflag.allowM && (!monAtPos.tame || mmflag.allowTM);
                }
                if (!allowMAttack && is_displacer(mon.type || {})) {
                    const defenderIsDisplacer = is_displacer(monAtPos.type || {});
                    const attackerHigherLevel = monLevel(mon) > monLevel(monAtPos);
                    const defenderIsGridBugDiag = (monAtPos.mndx === PM_GRID_BUG)
                        && (mon.mx !== monAtPos.mx && mon.my !== monAtPos.my);
                    const defenderMultiworm = !!monAtPos.wormno;
                    const attackerSize = Number.isInteger(mon.type?.size) ? mon.type.size : 0;
                    const defenderSize = Number.isInteger(monAtPos.type?.size) ? monAtPos.type.size : 0;
                    const sizeOk = isRider(mon) || attackerSize >= defenderSize;
                    allowMDisp = (!defenderIsDisplacer || attackerHigherLevel)
                        && !defenderIsGridBugDiag
                        && !monAtPos.mtrapped
                        && !defenderMultiworm
                        && sizeOk;
                }
            }
            if (monAtPos && !allowMAttack && !allowMDisp) continue;

            if (nx === player.x && ny === player.y) continue;
            if (onscary(map, nx, ny) && !allowSSM) continue;

            let hasBoulder = false;
            for (const obj of map.objects) {
                if (obj.buried) continue;
                if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
                    hasBoulder = true;
                    break;
                }
            }
            if (hasBoulder) continue;

            let allowTraps = false;
            const trap = map.trapAt(nx, ny);
            if (trap) {
                if (!m_harmless_trap(mon, trap)) {
                    if (!mon.tame && mon_knows_traps(mon, trap.ttyp)) {
                        continue;
                    }
                    allowTraps = true;
                }
            }

            if (nx !== omx && ny !== omy) {
                const sideAIsBadRock = bad_rock_for_mon(mon, map, omx, ny);
                const sideBIsBadRock = bad_rock_for_mon(mon, map, nx, omy);
                if (sideAIsBadRock && sideBIsBadRock && cant_squeeze_thru_mon(mon))
                    continue;
            }

            const mux = Number.isInteger(mon.mux) ? mon.mux : player.x;
            const muy = Number.isInteger(mon.muy) ? mon.muy : player.y;
            const monSeeHero = (mon.mcansee !== false)
                && !mon.blind
                && m_cansee(mon, map, player.x, player.y)
                && (!player.invisible || perceives(mon.type || {}));
            const notOnLine = monSeeHero
                && (nx === mux || ny === muy
                    || (ny - muy) === (nx - mux)
                    || (ny - muy) === -(nx - mux));

            positions.push({
                x: nx,
                y: ny,
                allowTraps,
                allowM: !!allowMAttack,
                allowMDisp: !!allowMDisp,
                notOnLine,
            });
        }
    }
    return positions;
}

// ========================================================================
// Hider premove — C ref: mon.c restrap() / movemon_singlemon()
// ========================================================================
function canSeeForRestrap(mon, map, player, fov) {
    if (!mon || !map || !player) return false;
    const canSeeSquare = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
    return !!canSeeSquare && !player.blind;
}

export function handleHiderPremove(mon, map, player, fov) {
    const ptr = mon.type || {};
    if (!is_hider(ptr)) return false;

    const trap = mon.mtrapped ? map.trapAt(mon.mx, mon.my) : null;
    const trappedOutsidePit = !!(mon.mtrapped && trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT);
    const isCeilingHider = ptr.symbol === S_PIERCER;
    const hasCeiling = !(map?.flags?.is_airlevel || map?.flags?.is_waterlevel);
    const sensedAndAdjacent = canSpotMonsterForMap(mon, map, player, fov) && monnear(mon, player.x, player.y);

    const blocked =
        mon.mcan
        || mon.m_ap_type
        || mon.appear_as_type
        || canSeeForRestrap(mon, map, player, fov)
        || rn2(3)
        || trappedOutsidePit
        || (isCeilingHider && !hasCeiling)
        || sensedAndAdjacent;

    if (!blocked) {
        if (ptr.symbol === S_MIMIC) {
            if (!(mon.sleeping || (mon.mfrozen > 0))) {
                mon.m_ap_type = mon.m_ap_type || 'object';
                return true;
            }
        } else if (map.at(mon.mx, mon.my)?.typ === ROOM) {
            mon.mundetected = true;
            return true;
        }
    }

    return !!(mon.m_ap_type || mon.appear_as_type || mon.mundetected);
}

// ========================================================================
// corpse_chance — C ref: mon.c:3178-3252
// ========================================================================

// C ref: mon.c:3178-3252 corpse_chance() — determines if monster leaves a corpse.
// Returns true if corpse should be created. CRITICAL: several early-return paths
// do NOT consume rn2(), so callers must use this instead of rolling directly.
export function corpse_chance(mon) {
    const mdat = mon?.type || (Number.isInteger(mon?.mndx) ? mons[mon.mndx] : {});
    if (!mdat) return false;

    // C ref: mon.c:3190-3194 — Vlad and liches crumble to dust (no corpse, no RNG)
    if (mon.mndx === PM_VLAD_THE_IMPALER || mdat.symbol === S_LICH)
        return false;

    // C ref: mon.c:3197-3229 — gas spores explode (no corpse, no RNG)
    if (mdat.attacks) {
        for (const atk of mdat.attacks) {
            if (atk && atk.type === AT_BOOM) return false;
        }
    }

    // C ref: mon.c:3233 — LEVEL_SPECIFIC_NOCORPSE
    // (Not relevant in early game — skip)

    // C ref: mon.c:3235-3238 — big monsters, lizards, golems, players, riders,
    // shopkeepers ALWAYS leave corpses (no RNG consumed)
    const bigmonst = (mdat.size || 0) >= MZ_LARGE;
    if (((bigmonst || mon.mndx === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)
        return true;

    // C ref: mon.c:3239-3240 — probabilistic: rn2(tmp) where tmp = 2 + rare + tiny
    const gfreq = (mdat.geno || 0) & G_FREQ;
    const verysmall = (mdat.size || 0) === MZ_TINY;
    const corpsetmp = 2 + (gfreq < 2 ? 1 : 0) + (verysmall ? 1 : 0);
    return !rn2(corpsetmp);
}




// ========================================================================
// movemon — C ref: mon.c movemon()
// ========================================================================
export function movemon(map, player, display, fov, game = null, { dochug, handleHiderPremove: hhp } = {}) {
    if (game) game._suppressMonsterHitMessagesThisTurn = false;
    if (map) map._heardDistantNoiseThisTurn = false;
    const turnCount = (player.turns || 0) + 1;
    const replayStep = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
    let anyMoved;
    do {
        anyMoved = false;
        for (const mon of map.monsters) {
            if (mon.dead) continue;
            if (mon.movement >= NORMAL_SPEED) {
                const oldx = mon.mx;
                const oldy = mon.my;
                const alreadySawMon = !!(game && game.occupation
                    && ((fov?.canSee ? fov.canSee(oldx, oldy) : couldsee(map, player, oldx, oldy))));
                mon.movement -= NORMAL_SPEED;
                anyMoved = true;
                monmoveTrace('turn-start',
                    `step=${monmoveStepLabel(map)}`,
                    `id=${mon.m_id ?? '?'}`,
                    `mndx=${mon.mndx ?? '?'}`,
                    `name=${mon.type?.name || mon.name || '?'}`,
                    `pos=(${oldx},${oldy})`,
                    `mv=${mon.movement + NORMAL_SPEED}->${mon.movement}`,
                    `flee=${mon.flee ? 1 : 0}`,
                    `peace=${mon.peaceful ? 1 : 0}`,
                    `conf=${mon.confused ? 1 : 0}`);
                if ((hhp || handleHiderPremove)(mon, map, player, fov)) {
                    continue;
                }
                dochug(mon, map, player, display, fov, game);
                if (game && game.occupation && !mon.dead) {
                    if (game.occupation.occtxt === 'waiting' || game.occupation.occtxt === 'searching') {
                        continue;
                    }
                    const attacks = mon.type?.attacks || [];
                    const noAttacks = !attacks.some((a) => a && a.type !== AT_NONE);
                    const threatRangeSq = (BOLT_LIM + 1) * (BOLT_LIM + 1);
                    const oldDist = dist2(oldx, oldy, player.x, player.y);
                    const newDist = dist2(mon.mx, mon.my, player.x, player.y);
                    const canSeeNow = fov?.canSee ? fov.canSee(mon.mx, mon.my)
                        : couldsee(map, player, mon.mx, mon.my);
                    const couldSeeOld = fov?.canSee ? fov.canSee(oldx, oldy)
                        : couldsee(map, player, oldx, oldy);
                    if (!mon.peaceful
                        && !noAttacks
                        && newDist <= threatRangeSq
                        && (!alreadySawMon || !couldSeeOld || oldDist > threatRangeSq)
                        && canSeeNow
                        && mon.mcanmove !== false
                        && !onscary(map, player.x, player.y)) {
                        game.display.putstr_message(`You stop ${game.occupation.occtxt}.`);
                        game.occupation = null;
                        game.multi = 0;
                    }
                }
            }
        }
        if (game && game._bonusMovement > 0) break;
    } while (anyMoved);

    map.monsters = map.monsters.filter(m => !m.dead);
    player.displacedPetThisTurn = false;
}
