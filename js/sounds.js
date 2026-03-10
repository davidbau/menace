// sounds.js -- Monster sounds, ambient room sounds, chat command
// cf. sounds.c — dosounds, domonnoise, growl/yelp/whimper/beg, dotalk/dochat,
//                maybe_gasp, cry_sound, set_voice, sound library system

import { rn2, rn1 } from './rng.js';
import {
    ROOMOFFSET, SHOPBASE, COURT, BEEHIVE, MORGUE, BARRACKS, ZOO,
    TEMPLE, LEPREHALL, FULL_MOON,
} from './const.js';
import {
    MS_SILENT, MS_BARK, MS_MEW, MS_ROAR, MS_BELLOW, MS_GROWL, MS_SQEEK,
    MS_SQAWK, MS_CHIRP, MS_HISS, MS_BUZZ, MS_GRUNT, MS_NEIGH, MS_MOO,
    MS_WAIL, MS_GURGLE, MS_BURBLE, MS_TRUMPET, MS_ANIMAL, MS_SHRIEK,
    MS_BONES, MS_LAUGH, MS_MUMBLE, MS_IMITATE, MS_WERE, MS_ORC,
    MS_HUMANOID, MS_ARREST, MS_SOLDIER, MS_GUARD, MS_DJINNI, MS_NURSE,
    MS_SEDUCE, MS_VAMPIRE, MS_BRIBE, MS_CUSS, MS_RIDER, MS_LEADER,
    MS_NEMESIS, MS_GUARDIAN, MS_SELL, MS_ORACLE, MS_PRIEST, MS_SPELL,
    MS_BOAST, MS_GROAN,
    S_ANT, S_EEL, S_NYMPH, S_CENTAUR, S_QUADRUPED,
    PM_ORACLE, PM_GECKO, PM_LONG_WORM, PM_RAVEN, PM_DINGO,
    PM_DEATH, PM_WATER_DEMON, PM_PRISONER,
    PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_WOLF, PM_WINTER_WOLF,
    PM_WINTER_WOLF_CUB, PM_HUMAN_WERERAT,
    PM_SILVER_DRAGON, PM_BABY_SILVER_DRAGON,
    PM_HOBBIT, PM_ARCHEOLOGIST, PM_TOURIST,
    mons,
} from './monsters.js';
import {
    is_lord, is_prince, is_animal, is_undead, is_flyer, is_silent,
    is_mercenary, is_elf, is_dwarf, is_gnome, is_humanoid,
    carnivorous, herbivorous, likes_magic, same_race,
    canseemon, x_monnam, is_mplayer,
} from './mondata.js';
import { wake_nearto } from './mon.js';
import { night, midnight } from './calendar.js';
import { vault_occupied, findgd } from './vault.js';
import { nhimport } from './origin_awaits.js';

// ============================================================================
// Hallucination sound table (cf. sounds.c:341)
// ============================================================================

const h_sounds = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

// ============================================================================
// Helper: mon_in_room (cf. sounds.c:19)
// ============================================================================

// cf. sounds.c:19 — mon_in_room(mon, rmtyp): check if monster is in room type
function mon_in_room(mon, rmtyp, map) {
    if (!mon || !map) return false;
    if (!Number.isInteger(mon.mx) || !Number.isInteger(mon.my)) return false;
    const loc = map.at(mon.mx, mon.my);
    if (!loc || !Number.isFinite(loc.roomno)) return false;
    const rno = loc.roomno;
    if (rno >= ROOMOFFSET) {
        const room = map.rooms?.[rno - ROOMOFFSET];
        return !!(room && room.rtype === rmtyp);
    }
    return false;
}

// ============================================================================
// Ambient room sound helpers (cf. sounds.c:29-199)
// These iterate monsters looking for qualifying ones in rooms.
// Each returns true if a sound was produced (caller returns early).
// ============================================================================

// cf. sounds.c:29 — throne_mon_sound(mtmp): throne room ambient sound
export async function throne_mon_sound(mtmp, hallu, game) {
    const ptr = mtmp.data || mtmp.type;
    if ((mtmp.msleeping || is_lord(ptr) || is_prince(ptr))
        && !is_animal(ptr)
        && mon_in_room(mtmp, COURT, (game.lev || game.map))) {
        const throne_msg = [
            'the tones of courtly conversation.',
            'a sceptre pounded in judgment.',
            'Someone shouts "Off with %s head!"',
            "Queen Beruthiel's cats!",
        ];
        const which = rn2(3) + hallu;
        if (which !== 2) {
            await game.display.putstr_message(`You hear ${throne_msg[which]}`);
        } else {
            // C ref: sounds.c:52 — pline(throne_msg[2], uhis())
            // C uhis() uses flags.female; match that via game.flags.female.
            const pron = game.flags?.female ? 'her' : 'his';
            await game.display.putstr_message(throne_msg[2].replace('%s', pron));
        }
        return true;
    }
    return false;
}

// cf. sounds.c:61 — beehive_mon_sound(mtmp): beehive ambient sound
export async function beehive_mon_sound(mtmp, hallu, game) {
    const ptr = mtmp.data || mtmp.type;
    if ((ptr.mlet === S_ANT && is_flyer(ptr))
        && mon_in_room(mtmp, BEEHIVE, (game.lev || game.map))) {
        switch (rn2(2) + hallu) {
        case 0:
            await game.display.putstr_message('You hear a low buzzing.');
            break;
        case 1:
            await game.display.putstr_message('You hear an angry drone.');
            break;
        case 2: {
            const helmet = (game.u || game.player)?.helmet ? '' : '(nonexistent) ';
            await game.display.putstr_message(`You hear bees in your ${helmet}bonnet!`);
            break;
        }
        }
        return true;
    }
    return false;
}

// cf. sounds.c:88 — morgue_mon_sound(mtmp): morgue ambient sound
export async function morgue_mon_sound(mtmp, hallu, game) {
    const ptr = mtmp.data || mtmp.type;
    if (is_undead(ptr) && mon_in_room(mtmp, MORGUE, (game.lev || game.map))) {
        switch (rn2(2) + hallu) {
        case 0:
            await game.display.putstr_message('You suddenly realize it is unnaturally quiet.');
            break;
        case 1:
            await game.display.putstr_message('The hair on the back of your neck stands up.');
            break;
        case 2:
            await game.display.putstr_message('The hair on your head seems to stand up.');
            break;
        }
        return true;
    }
    return false;
}

// cf. sounds.c:114 — zoo_mon_sound(mtmp): zoo ambient sound
export async function zoo_mon_sound(mtmp, hallu, game) {
    const ptr = mtmp.data || mtmp.type;
    if ((mtmp.sleeping || is_animal(ptr))
        && mon_in_room(mtmp, ZOO, (game.lev || game.map))) {
        const zoo_msg = [
            'a sound reminiscent of an elephant stepping on a peanut.',
            'a sound reminiscent of a seal barking.',
            'Doctor Dolittle!',
        ];
        const selection = rn2(2) + hallu;
        await game.display.putstr_message(`You hear ${zoo_msg[selection]}`);
        return true;
    }
    return false;
}

// cf. sounds.c:130 — temple_priest_sound(mtmp): temple ambient sound
// Fires for awake priests in their temple, hero not in that temple.
// Full implementation requires inhistemple, temple_occupied, EPRI which
// are not yet ported. We consume RNG to match C, then emit a generic message.
export async function temple_priest_sound(mtmp, hallu, game) {
    if (mtmp.ispriest && !mtmp.sleeping) {
        // Simplified check: priest must be in a TEMPLE room
        if (!mon_in_room(mtmp, TEMPLE, (game.lev || game.map))) return false;

        // C sounds.c:159-166: retry loop with *=speechless, #=in_sight guards
        const temple_msg = [
            'someone praising a deity.',       // C: *someone praising %s.
            'someone beseeching a deity.',      // C: *someone beseeching %s.
            'an animal carcass being offered in sacrifice.', // C: #an animal carcass...
            'a strident plea for donations.',   // C: *a strident plea...
        ];
        const msgCount = temple_msg.length;
        const speechless = ((mtmp.data || mtmp.type).msound || 0) <= MS_ANIMAL;
        const in_sight = canseemon(mtmp); // simplified: C also checks cansee(altar)
        let trycount = 0;
        let msgIdx;
        do {
            msgIdx = rn2(msgCount - 1 + hallu);
            // C: * prefix (indices 0,1,3) → retry if speechless
            if ((msgIdx === 0 || msgIdx === 1 || msgIdx === 3) && speechless)
                continue;
            // C: # prefix (index 2) → retry if in_sight
            if (msgIdx === 2 && in_sight)
                continue;
            break;
        } while (++trycount < 50);
        await game.display.putstr_message(`You hear ${temple_msg[msgIdx]}`);
        return true;
    }
    return false;
}

// cf. sounds.c:180 — oracle_sound(mtmp): oracle ambient sound
export async function oracle_sound(mtmp, hallu, game) {
    if ((mtmp.data || mtmp.type) !== mons[PM_ORACLE]) return false;

    if (hallu || !canseemon(mtmp, (game.u || game.player), game.fov)) {
        const ora_msg = [
            'a strange wind.',
            'convulsive ravings.',
            'snoring snakes.',
            'someone say "No more woodchucks!"',
            'a loud ZOT!',
        ];
        await game.display.putstr_message(`You hear ${ora_msg[rn2(3) + hallu * 2]}`);
    }
    return true;
}

// ============================================================================
// dosounds() — per-turn ambient level sound effects (cf. sounds.c:201)
// CRITICAL: This is called every turn from moveloop. RNG consumption order
// must match C exactly.
// ============================================================================

// cf. sounds.c:201 — dosounds(): per-turn ambient level sound effects
// Checks level feature flags in order; each check uses !rn2(N).
// Order: fountains(400) → sinks(300) → court(200) → swamp(200) → vault(200) →
//   beehive(200) → morgue(200) → barracks(200) → zoo(200) → shop(200) →
//   leprehall(200) → temple(200) → oracle(200).
export async function dosounds(game) {
    // C ref: if (Deaf || !flags.acoustics || u.uswallow || Underwater) return;
    if ((game.u || game.player)?.deaf) return;
    if (game.flags && game.flags.acoustics === false) return;
    if ((game.u || game.player)?.uswallow) return;
    if ((game.u || game.player)?.underwater) return;

    const hallu = (game.u || game.player)?.hallucinating ? 1 : 0;
    const f = (game.lev || game.map).flags || {};
    const map = (game.lev || game.map);

    // --- Fountains (rn2(400)) — does NOT return early ---
    if (f.nfountains && !rn2(400)) {
        const fountain_msg = [
            'bubbling water.',
            'water falling on coins.',
            'the splashing of a naiad.',
            'a soda fountain!',
        ];
        await game.display.putstr_message(`You hear ${fountain_msg[rn2(3) + hallu]}`);
    }

    // --- Sinks (rn2(300)) — does NOT return early ---
    if (f.nsinks && !rn2(300)) {
        const sink_msg = [
            'a slow drip.',
            'a gurgling noise.',
            'dishes being washed!',
        ];
        await game.display.putstr_message(`You hear ${sink_msg[rn2(2) + hallu]}`);
    }

    // --- Court / throne room (rn2(200)) ---
    if (f.has_court && !rn2(200)) {
        // C: get_iter_mons(throne_mon_sound) — iterate all monsters
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await throne_mon_sound(mtmp, hallu, game)) return;
        }
    }

    // --- Swamp (rn2(200)) ---
    if (f.has_swamp && !rn2(200)) {
        const swamp_msg = [
            'You hear mosquitoes!',
            'You smell marsh gas!',
            'You hear Donald Duck!',
        ];
        await game.display.putstr_message(swamp_msg[rn2(2) + hallu]);
        return;
    }

    // --- Vault (rn2(200)) ---
    if (f.has_vault && !rn2(200)) {
        // C sounds.c:244: if (gd_sound()) — skip sounds if vault occupied or guard exists
        // vault_occupied returns null for "not in vault", room char for "in vault"
        const player = game.u || game.player;
        const vaultOcc = vault_occupied(player?.urooms || '', map);
        const gdSound = !(vaultOcc || findgd(map, player));
        if (gdSound)
        switch (rn2(2) + hallu) {
        case 1:
            // C: checks gold_in_vault and vault_occupied; simplified here
            await game.display.putstr_message('You hear someone counting gold coins.');
            break;
        case 0:
            await game.display.putstr_message('You hear the footsteps of a guard on patrol.');
            break;
        case 2:
            await game.display.putstr_message('You hear Ebenezer Scrooge!');
            break;
        }
        return;
    }

    // --- Beehive (rn2(200)) ---
    if (f.has_beehive && !rn2(200)) {
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await beehive_mon_sound(mtmp, hallu, game)) return;
        }
    }

    // --- Morgue (rn2(200)) ---
    if (f.has_morgue && !rn2(200)) {
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await morgue_mon_sound(mtmp, hallu, game)) return;
        }
    }

    // --- Barracks (rn2(200)) ---
    if (f.has_barracks && !rn2(200)) {
        const barracks_msg = [
            'blades being honed.',
            'loud snoring.',
            'dice being thrown.',
            'General MacArthur!',
        ];
        let count = 0;
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (is_mercenary(mtmp.data || mtmp.type)
                && mon_in_room(mtmp, BARRACKS, map)
                && (mtmp.sleeping || ++count > 5)) {
                await game.display.putstr_message(`You hear ${barracks_msg[rn2(3) + hallu]}`);
                return;
            }
        }
    }

    // --- Zoo (rn2(200)) ---
    if (f.has_zoo && !rn2(200)) {
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await zoo_mon_sound(mtmp, hallu, game)) return;
        }
    }

    // --- Shop (rn2(200)) ---
    if (f.has_shop && !rn2(200)) {
        // C: search_special(ANY_SHOP), tended_shop(sroom), ushops check
        // Simplified: check if any shopkeeper is alive & player not in shop
        const tendedShop = (map.monsters || []).some(
            (m) => m && !m.dead && m.isshk
        );
        const playerInShop = (() => {
            const loc = map.at?.((game.u || game.player).x, (game.u || game.player).y);
            if (!loc || !Number.isFinite(loc.roomno)) return false;
            const ridx = loc.roomno - ROOMOFFSET;
            const room = map.rooms?.[ridx];
            return !!(room && Number.isFinite(room.rtype)
                      && room.rtype >= SHOPBASE);
        })();
        if (tendedShop && !playerInShop) {
            const shop_msg = [
                'someone cursing shoplifters.',
                'the chime of a cash register.',
                'Neiman and Marcus arguing!',
            ];
            await game.display.putstr_message(`You hear ${shop_msg[rn2(2) + hallu]}`);
            // C: noisy_shop(sroom) — not ported, skip
        }
        return;
    }

    // --- Leprechaun hall (rn2(200)) ---
    // C: has_leprehall check but no get_iter_mons — just returns.
    // No messages in C either (the feature flag exists but dosounds
    // doesn't print anything for leprehall; it just falls through).
    // Actually looking at C more carefully: leprehall is NOT in dosounds.
    // The comment in the stub was wrong. C goes: court→swamp→vault→
    //   beehive→morgue→barracks→zoo→shop→temple→oracle.
    // There is no leprehall check in C's dosounds(). Skip it.

    // --- Temple (rn2(200)) ---
    // C sounds.c:330: if (has_temple && !rn2(200) && !(Is_astralevel || Is_sanctum))
    // Is_astralevel/Is_sanctum are stubs (false) so guard is a no-op for now.
    if (f.has_temple && !rn2(200) && !(f.is_astral || f.is_sanctum)) {
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await temple_priest_sound(mtmp, hallu, game)) return;
        }
    }

    // --- Oracle (rn2(400)) ---
    // C: if (Is_oracle_level(&u.uz) && !rn2(400))
    if (f.is_oracle_level && !rn2(400)) {
        for (const mtmp of map.monsters) {
            if (mtmp.dead) continue;
            if (await oracle_sound(mtmp, hallu, game)) return;
        }
    }
}

// ============================================================================
// growl_sound (cf. sounds.c:350)
// ============================================================================

// cf. sounds.c:350 — growl_sound(mtmp): return growl verb string
export function growl_sound(mtmp) {
    const ptr = mtmp.data || mtmp.type || mtmp;
    switch (ptr.msound) {
    case MS_MEW:
    case MS_HISS:
        return 'hiss';
    case MS_BARK:
    case MS_GROWL:
        return 'growl';
    case MS_ROAR:
        return 'roar';
    case MS_BELLOW:
        return 'bellow';
    case MS_BUZZ:
        return 'buzz';
    case MS_SQEEK:
        return 'squeal';
    case MS_SQAWK:
        return 'screech';
    case MS_NEIGH:
        return 'neigh';
    case MS_WAIL:
        return 'wail';
    case MS_GROAN:
        return 'groan';
    case MS_MOO:
        return 'low';
    case MS_SILENT:
        return 'commotion';
    default:
        return 'scream';
    }
}

// ============================================================================
// growl (cf. sounds.c:401)
// ============================================================================

// cf. sounds.c:401 — growl(mtmp): seriously abused pet growls at hero
export async function growl(mtmp, game) {
    if ((mtmp.sleeping || mtmp.paralyzed || mtmp.stunned)
        || (mtmp.data || mtmp.type).msound === MS_SILENT)
        return;

    let verb;
    if ((game.u || game.player)?.hallucinating) {
        verb = h_sounds[rn2(h_sounds.length)];
    } else {
        verb = growl_sound(mtmp);
    }
    if (verb) {
        const name = x_monnam(mtmp);
        // C: vtense — add "s" for 3rd person singular
        const verbed = verb.endsWith('s') ? `${verb}es` : `${verb}s`;
        await game.display.putstr_message(`${name} ${verbed}!`);
        wake_nearto(mtmp.x, mtmp.y, ((mtmp.data || mtmp.type).mlevel || 0) * 18, (game.lev || game.map));
    }
}

// ============================================================================
// yelp (cf. sounds.c:426)
// ============================================================================

// cf. sounds.c:426 — yelp(mtmp): mistreated pet yelps
export async function yelp(mtmp, game) {
    if ((mtmp.sleeping || mtmp.paralyzed) || !(mtmp.data || mtmp.type).msound)
        return;

    let verb = null;
    if ((game.u || game.player)?.hallucinating) {
        verb = h_sounds[rn2(h_sounds.length)];
    } else {
        switch ((mtmp.data || mtmp.type).msound) {
        case MS_MEW:
            verb = 'yowl';
            break;
        case MS_BARK:
        case MS_GROWL:
            verb = 'yelp';
            break;
        case MS_ROAR:
            verb = 'snarl';
            break;
        case MS_SQEEK:
            verb = 'squeal';
            break;
        case MS_SQAWK:
            verb = 'screak';
            break;
        case MS_WAIL:
            verb = 'wail';
            break;
        }
    }
    if (verb) {
        const name = x_monnam(mtmp);
        const verbed = verb.endsWith('s') ? `${verb}es` : `${verb}s`;
        await game.display.putstr_message(`${name} ${verbed}!`);
        wake_nearto(mtmp.x, mtmp.y, ((mtmp.data || mtmp.type).mlevel || 0) * 12, (game.lev || game.map));
    }
}

// ============================================================================
// whimper (cf. sounds.c:478)
// ============================================================================

// cf. sounds.c:478 — whimper(mtmp): distressed pet whimpers
export async function whimper(mtmp, game) {
    if ((mtmp.sleeping || mtmp.paralyzed) || !(mtmp.data || mtmp.type).msound)
        return;

    let verb = null;
    if ((game.u || game.player)?.hallucinating) {
        verb = h_sounds[rn2(h_sounds.length)];
    } else {
        switch ((mtmp.data || mtmp.type).msound) {
        case MS_MEW:
        case MS_GROWL:
            verb = 'whimper';
            break;
        case MS_BARK:
            verb = 'whine';
            break;
        case MS_SQEEK:
            verb = 'squeal';
            break;
        }
    }
    if (verb) {
        const name = x_monnam(mtmp);
        const verbed = verb.endsWith('s') ? `${verb}es` : `${verb}s`;
        await game.display.putstr_message(`${name} ${verbed}.`);
        wake_nearto(mtmp.x, mtmp.y, ((mtmp.data || mtmp.type).mlevel || 0) * 6, (game.lev || game.map));
    }
}

// ============================================================================
// beg (cf. sounds.c:518)
// ============================================================================

// cf. sounds.c:518 — beg(mtmp): hungry pet begs for food
export async function beg(mtmp, game) {
    if ((mtmp.sleeping || mtmp.paralyzed)
        || !(carnivorous(mtmp.data || mtmp.type) || herbivorous(mtmp.data || mtmp.type)))
        return;

    if (!is_silent(mtmp.data || mtmp.type) && (mtmp.data || mtmp.type).msound <= MS_ANIMAL) {
        await domonnoise(mtmp, game);
    } else if ((mtmp.data || mtmp.type).msound >= MS_HUMANOID) {
        await game.display.putstr_message(`"I'm hungry."`);
    } else {
        const name = x_monnam(mtmp);
        await game.display.putstr_message(`${name} seems famished.`);
    }
}

// ============================================================================
// maybe_gasp (cf. sounds.c:545)
// ============================================================================

// cf. sounds.c:545 — maybe_gasp(mon): hero attacked a peaceful monster
const Exclam = ['Gasp!', 'Uh-oh.', 'Oh my!', 'What?', 'Why?'];

export function maybe_gasp(mon) {
    const ptr = mon.data || mon.type;
    let msound = ptr.msound;
    let dogasp = false;

    // Guardian/priest adjustments
    if (msound === MS_GUARDIAN) msound = MS_SILENT; // simplified
    if (msound === MS_CUSS) msound = MS_HUMANOID; // simplified for co-aligned

    switch (msound) {
    case MS_HUMANOID:
    case MS_ARREST:
    case MS_SOLDIER:
    case MS_GUARD:
    case MS_NURSE:
    case MS_SEDUCE:
    case MS_LEADER:
    case MS_GUARDIAN:
    case MS_SELL:
    case MS_ORACLE:
    case MS_PRIEST:
    case MS_BOAST:
    case MS_IMITATE:
        dogasp = true;
        break;
    case MS_ORC:
    case MS_GRUNT:
    case MS_LAUGH:
    case MS_ROAR:
    case MS_BELLOW:
    case MS_DJINNI:
    case MS_VAMPIRE:
    case MS_WERE:
    case MS_SPELL:
        dogasp = false; // would need hero mlet comparison
        break;
    case MS_BRIBE:
    case MS_CUSS:
    case MS_RIDER:
    case MS_NEMESIS:
    case MS_SILENT:
    default:
        break;
    }
    if (dogasp) {
        return Exclam[rn2(Exclam.length)];
    }
    return null;
}

// ============================================================================
// cry_sound (cf. sounds.c:616)
// ============================================================================

// cf. sounds.c:616 — cry_sound(mtmp): sound verb for a hatching egg
export function cry_sound(mtmp) {
    const ptr = mtmp.data || mtmp.type || mtmp;
    switch (ptr.msound) {
    default:
    case MS_SILENT:
        return (ptr.mlet === S_EEL) ? 'gurgle' : 'chitter';
    case MS_HISS:
        return 'hiss';
    case MS_ROAR:
    case MS_GROWL:
        return 'growl';
    case MS_CHIRP:
        return 'chirp';
    case MS_BUZZ:
        return 'buzz';
    case MS_SQAWK:
        return 'screech';
    case MS_GRUNT:
        return 'grunt';
    case MS_MUMBLE:
        return 'mumble';
    }
}

// ============================================================================
// mon_is_gecko (cf. sounds.c:658)
// ============================================================================

// cf. sounds.c:658 — mon_is_gecko(mon): check if monster appears as gecko
export function mon_is_gecko(mon) {
    if ((mon.data || mon.type) === mons[PM_GECKO]) return true;
    if ((mon.data || mon.type) === mons[PM_LONG_WORM]) return false;
    // Simplified: would need glyph_at/glyph_to_mon for hallucination check
    return false;
}

// ============================================================================
// domonnoise (cf. sounds.c:678)
// ============================================================================

// cf. sounds.c:678 — domonnoise(mtmp): monster makes its characteristic sound
// Large dispatch on msound. Many sub-functions (doconsult, priest_talk,
// quest_chat, shk_chat, demon_talk) are not yet ported. We still consume
// RNG in the correct order for all cases that use it.
export async function domonnoise(mtmp, game) {
    const ptr = mtmp.data || mtmp.type;
    let msound = ptr.msound;
    let pline_msg = null;
    let verbl_msg = null;

    // C: if (Deaf) return
    if ((game.u || game.player)?.deaf) return 0;
    // C: if (is_silent(ptr) && !mtmp.isshk) return
    if (is_silent(ptr) && !mtmp.isshk) return 0;

    // --- msound adjustments (cf. sounds.c:696-714) ---
    // leader override
    if (mtmp.m_id === game.quest_status?.leader_m_id && msound > MS_ANIMAL)
        msound = MS_LEADER;
    // guardian check (simplified)
    else if (msound === MS_GUARDIAN) {
        // In full port: check urole.guardnum; fall back to genus msound
        msound = MS_HUMANOID; // safe fallback
    }
    // shopkeeper override
    else if (mtmp.isshk)
        msound = MS_SELL;
    // orc + same race or hallucination → humanoid
    else if (msound === MS_ORC && (game.u || game.player)?.hallucinating)
        msound = MS_HUMANOID;
    // untamed moo → bellow
    else if (msound === MS_MOO && !mtmp.tame)
        msound = MS_BELLOW;
    // hallucination + gecko → sell (GEICO joke)
    else if ((game.u || game.player)?.hallucinating && mon_is_gecko(mtmp))
        msound = MS_SELL;

    // --- Main dispatch (cf. sounds.c:722-1220) ---
    switch (msound) {
    case MS_ORACLE:
        // C: return doconsult(mtmp) — not yet ported
        await game.display.putstr_message(`${x_monnam(mtmp)} speaks mysteriously.`);
        return 1;

    case MS_PRIEST:
        // C: priest_talk(mtmp) — not yet ported
        await game.display.putstr_message(`${x_monnam(mtmp)} mutters a prayer.`);
        break;

    case MS_LEADER:
    case MS_NEMESIS:
    case MS_GUARDIAN:
        // C: quest_chat(mtmp) — not yet ported
        await game.display.putstr_message(`${x_monnam(mtmp)} speaks to you.`);
        break;

    case MS_SELL:
        // C: shk_chat or GEICO joke
        if (!(game.u || game.player)?.hallucinating || is_silent(ptr)
            || (mtmp.isshk && !rn2(2))) {
            // C: shk_chat(mtmp) — not yet ported
            if (mtmp.isshk) {
                await game.display.putstr_message(`${x_monnam(mtmp)} talks shop.`);
            } else {
                await game.display.putstr_message(`${x_monnam(mtmp)} talks to you.`);
            }
        } else {
            verbl_msg = '15 minutes could save you 15 zorkmids.';
        }
        break;

    case MS_VAMPIRE: {
        const isnight = night();
        const kindred = false; // simplified: would need Upolyd check
        const nightchild = false;
        if (mtmp.tame) {
            if (kindred) {
                verbl_msg = isnight ? 'Good evening to you Master!'
                    : 'Good day to you Master.  Why do we not rest?';
            } else {
                verbl_msg = midnight()
                    ? 'I can stand this craving no longer!'
                    : isnight
                        ? 'I beg you, help me satisfy this growing craving!'
                        : 'I find myself growing a little weary.';
            }
        } else if (mtmp.peaceful) {
            verbl_msg = 'I only drink... potions.';
        } else {
            // Hostile vampire — consumes rn2(2)
            const vampmsg = [
                'I vant to suck your blood!',
                'I vill come after you without regret!',
            ];
            const vampindex = rn2(vampmsg.length);
            verbl_msg = vampmsg[vampindex];
        }
        break;
    }
    case MS_WERE:
        if (game.flags?.moonphase === FULL_MOON
            && (night() ^ !rn2(13))) {
            const howl = (ptr === mons[PM_HUMAN_WERERAT])
                ? 'shriek' : 'howl';
            await game.display.putstr_message(
                `${x_monnam(mtmp)} throws back its head`
                + ` and lets out a blood curdling ${howl}!`
            );
            wake_nearto(mtmp.x, mtmp.y, 11 * 11, (game.lev || game.map));
        } else {
            pline_msg = 'whispers inaudibly.  All you can make out is "moon".';
        }
        break;

    case MS_BARK:
        if (game.flags?.moonphase === 2 && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.peaceful) {
            if (mtmp.tame
                && (mtmp.confused || mtmp.mflee || mtmp.trapped
                    || (mtmp.edog && game.turnCount > mtmp.edog.hungrytime)
                    || (mtmp.tame < 5)))
                pline_msg = 'whines.';
            else if (mtmp.tame && mtmp.edog
                     && mtmp.edog.hungrytime > game.turnCount + 1000)
                pline_msg = 'yips.';
            else {
                if (ptr !== mons[PM_DINGO])
                    pline_msg = 'barks.';
            }
        } else {
            pline_msg = 'growls.';
        }
        break;

    case MS_MEW:
        if (mtmp.tame) {
            if (mtmp.confused || mtmp.mflee || mtmp.trapped
                || (mtmp.tame < 5))
                pline_msg = 'yowls.';
            else if (mtmp.edog && game.turnCount > mtmp.edog.hungrytime)
                pline_msg = 'meows.';
            else if (mtmp.edog
                     && mtmp.edog.hungrytime > game.turnCount + 1000)
                pline_msg = 'purrs.';
            else
                pline_msg = 'mews.';
            break;
        }
        // FALLTHRU
    case MS_GROWL: // eslint-disable-line no-fallthrough
        pline_msg = mtmp.peaceful ? 'snarls.' : 'growls!';
        break;

    case MS_ROAR:
        pline_msg = mtmp.peaceful ? 'snarls.' : 'roars!';
        break;

    case MS_SQEEK:
        pline_msg = 'squeaks.';
        break;

    case MS_SQAWK:
        if (ptr === mons[PM_RAVEN] && !mtmp.peaceful)
            verbl_msg = 'Nevermore!';
        else
            pline_msg = 'squawks.';
        break;

    case MS_HISS:
        if (!mtmp.peaceful)
            pline_msg = 'hisses!';
        else
            return 0; // no sound
        break;

    case MS_BUZZ:
        pline_msg = mtmp.peaceful ? 'drones.' : 'buzzes angrily.';
        break;

    case MS_GRUNT:
        pline_msg = 'grunts.';
        break;

    case MS_NEIGH:
        if ((mtmp.tame || 0) < 5)
            pline_msg = 'neighs.';
        else if (mtmp.edog && game.turnCount > mtmp.edog.hungrytime)
            pline_msg = 'whinnies.';
        else
            pline_msg = 'whickers.';
        break;

    case MS_MOO:
        pline_msg = 'moos.';
        break;

    case MS_BELLOW:
        pline_msg = 'bellows!';
        break;

    case MS_CHIRP:
        pline_msg = 'chirps.';
        break;

    case MS_WAIL:
        pline_msg = 'wails mournfully.';
        break;

    case MS_GROAN:
        if (!rn2(3))
            pline_msg = 'groans.';
        break;

    case MS_GURGLE:
        pline_msg = 'gurgles.';
        break;

    case MS_BURBLE:
        pline_msg = 'burbles.';
        break;

    case MS_TRUMPET:
        pline_msg = 'trumpets!';
        wake_nearto(mtmp.x, mtmp.y, 11 * 11, (game.lev || game.map));
        break;

    case MS_SHRIEK:
        pline_msg = 'shrieks.';
        // C: aggravate() — not ported, would wake all monsters
        break;

    case MS_IMITATE:
        pline_msg = 'imitates you.';
        break;

    case MS_BONES:
        await game.display.putstr_message(`${x_monnam(mtmp)} rattles noisily.`);
        await game.display.putstr_message('You freeze for a moment.');
        // C: nomul(-2) — movement penalty, simplified
        break;

    case MS_LAUGH: {
        const laugh_msg = ['giggles.', 'chuckles.', 'snickers.', 'laughs.'];
        pline_msg = laugh_msg[rn2(4)];
        break;
    }
    case MS_MUMBLE:
        pline_msg = 'mumbles incomprehensibly.';
        break;

    case MS_ORC:
        pline_msg = 'grunts.';
        break;

    case MS_DJINNI:
        if (mtmp.tame)
            verbl_msg = "Sorry, I'm all out of wishes.";
        else if (mtmp.peaceful) {
            if (ptr === mons[PM_WATER_DEMON])
                pline_msg = 'gurgles.';
            else
                verbl_msg = "I'm free!";
        } else {
            if (ptr !== mons[PM_PRISONER])
                verbl_msg = 'This will teach you not to disturb me!';
            else
                verbl_msg = 'Get me out of here.';
        }
        break;

    case MS_BOAST:
        if (!mtmp.peaceful) {
            switch (rn2(4)) {
            case 0:
                await game.display.putstr_message(
                    `${x_monnam(mtmp)} boasts about its gem collection.`
                );
                break;
            case 1:
                pline_msg = 'complains about a diet of mutton.';
                break;
            default:
                pline_msg = 'shouts "Fee Fie Foe Foo!" and guffaws.';
                wake_nearto(mtmp.x, mtmp.y, 7 * 7, (game.lev || game.map));
                break;
            }
            break;
        }
        // FALLTHRU to MS_HUMANOID
    case MS_HUMANOID: // eslint-disable-line no-fallthrough
        if (!mtmp.peaceful) {
            pline_msg = 'threatens you.';
            break;
        }
        // Generic peaceful humanoid behavior
        if (mtmp.mflee)
            pline_msg = 'wants nothing to do with you.';
        else if (mtmp.hp < Math.floor((mtmp.hpmax || 1) / 4))
            pline_msg = 'moans.';
        else if (mtmp.confused || mtmp.stunned)
            verbl_msg = !rn2(3) ? 'Huh?' : rn2(2) ? 'What?' : 'Eh?';
        else if (mtmp.blinded)
            verbl_msg = "I can't see!";
        else if (mtmp.trapped)
            verbl_msg = "I'm trapped!";
        else if (mtmp.hp < Math.floor((mtmp.hpmax || 1) / 2))
            pline_msg = 'asks for a potion of healing.';
        else if (mtmp.tame && !mtmp.isminion
                 && mtmp.edog && game.turnCount > mtmp.edog.hungrytime)
            verbl_msg = "I'm hungry.";
        else if (is_elf(ptr))
            pline_msg = 'curses orcs.';
        else if (is_dwarf(ptr))
            pline_msg = 'talks about mining.';
        else if (likes_magic(ptr))
            pline_msg = 'talks about spellcraft.';
        else if (ptr.mlet === S_CENTAUR)
            pline_msg = 'discusses hunting.';
        else if (is_gnome(ptr)) {
            let gnomeplan = 0;
            if ((game.u || game.player)?.hallucinating
                && (gnomeplan = rn2(4)) % 2) {
                // Gnome underpants joke from South Park
                verbl_msg = (gnomeplan === 1)
                    ? 'Phase one, collect underpants.'
                    : 'Phase three, profit!';
            } else {
                verbl_msg = 'Many enter the dungeon,'
                    + ' and few return to the sunlit lands.';
            }
        } else {
            // Specific monster types
            const pmidx = mons.indexOf(ptr);
            switch (pmidx) {
            case PM_HOBBIT:
                pline_msg = (mtmp.hp < (mtmp.hpmax || 1)
                             && ((mtmp.hpmax || 1) <= 10
                                 || mtmp.hp <= (mtmp.hpmax || 1) - 10))
                    ? 'complains about unpleasant dungeon conditions.'
                    : 'asks you about the One Ring.';
                break;
            case PM_ARCHEOLOGIST:
                pline_msg = 'describes a recent article in'
                    + ' "Spelunker Today" magazine.';
                break;
            case PM_TOURIST:
                verbl_msg = 'Aloha.';
                break;
            default:
                pline_msg = 'discusses dungeon exploration.';
                break;
            }
        }
        break;

    case MS_SEDUCE: {
        // C: SYSOPT_SEDUCE check, could_seduce, doseduce
        // Simplified: just consume rn2(3) and produce message
        const swval = rn2(3);
        switch (swval) {
        case 2:
            verbl_msg = 'Hello, sailor.';
            break;
        case 1:
            pline_msg = 'comes on to you.';
            break;
        default:
            pline_msg = 'cajoles you.';
        }
        break;
    }
    case MS_ARREST:
        if (mtmp.peaceful) {
            const title = game.flags?.female ? "Ma'am" : 'Sir';
            await game.display.putstr_message(`"Just the facts, ${title}."`);
        } else {
            const arrest_msg = [
                'Anything you say can be used against you.',
                "You're under arrest!",
                'Stop in the name of the Law!',
            ];
            verbl_msg = arrest_msg[rn2(3)];
        }
        break;

    case MS_BRIBE:
        if (mtmp.peaceful && !mtmp.tame) {
            // C: demon_talk(mtmp) — not ported
            await game.display.putstr_message(`${x_monnam(mtmp)} makes a deal.`);
            break;
        }
        // FALLTHRU
    case MS_CUSS: // eslint-disable-line no-fallthrough
        if (!mtmp.peaceful) {
            // C: cuss(mtmp) — not ported
            await game.display.putstr_message(`${x_monnam(mtmp)} curses at you!`);
        } else {
            verbl_msg = "We're all doomed.";
        }
        break;

    case MS_SPELL:
        pline_msg = 'seems to mutter a cantrip.';
        break;

    case MS_NURSE:
        if (mtmp.cancelled)
            verbl_msg = 'I hate this job!';
        else
            verbl_msg = "Relax, this won't hurt a bit.";
        break;

    case MS_GUARD:
        verbl_msg = 'Please follow me.';
        break;

    case MS_SOLDIER: {
        const soldier_foe = [
            'Resistance is useless!', "You're dog meat!", 'Surrender!',
        ];
        const soldier_pax = [
            "What lousy pay we're getting here!",
            "The food's not fit for Orcs!",
            "My feet hurt, I've been on them all day!",
        ];
        verbl_msg = mtmp.peaceful ? soldier_pax[rn2(3)]
            : soldier_foe[rn2(3)];
        break;
    }
    case MS_RIDER: {
        const ms_Death = (ptr === mons[PM_DEATH]);
        // C: first checks tribute/novel (no RNG); we skip that.
        // Then: rn2(3) && Death_quote(); else rn2(10).
        if (ms_Death && rn2(3)) {
            // C: Death_quote(verbuf) — not ported; use placeholder.
            // Death_quote itself does not consume RNG.
            verbl_msg = 'THERE IS NO JUSTICE. THERE IS JUST ME.';
        } else if (ms_Death && !rn2(10)) {
            // rn2(3) returned 0, so we reach here and consume rn2(10)
            pline_msg = 'is busy reading a copy of Sandman #8.';
        } else {
            // Either not Death, or rn2(3)==0 && rn2(10)!=0
            verbl_msg = 'Who do you think you are, War?';
        }
        break;
    }
    } // switch

    if (pline_msg) {
        await game.display.putstr_message(`${x_monnam(mtmp)} ${pline_msg}`);
    } else if (verbl_msg) {
        if (ptr === mons[PM_DEATH]) {
            await game.display.putstr_message(verbl_msg.toUpperCase());
        } else {
            await game.display.putstr_message(`"${verbl_msg}"`);
        }
    }
    return 1;
}

// ============================================================================
// dotalk / dochat (cf. sounds.c:1247-1409)
// ============================================================================

// cf. sounds.c:1247 — dotalk(): #chat command handler
// cf. sounds.c:1247-1409 — full direction + monster-lookup implementation.
export async function dotalk(game) {
    const { player, map, display } = game;

    // cf. sounds.c:1262 — swallowed: can't chat from inside a monster
    if (player.uswallow) {
        await display.putstr_message("They won't hear you out there.");
        return 0;
    }

    // cf. sounds.c:1266 — strangled: can't speak
    if (player.strangled) {
        await display.putstr_message("You can't.  You're choking!");
        return 0;
    }

    // cf. sounds.c:1287 — prompt for direction
    // Lazy import to avoid circular dependency.
    const { nhgetch } = await nhimport('./input.js');
    const { DIRECTION_KEYS } = await nhimport('./const.js');
    await display.putstr_message('Talk to whom? (in what direction)');
    const ch = await nhgetch();
    const c = String.fromCharCode(ch);
    const dir = DIRECTION_KEYS[c.toLowerCase()];

    // Cancel / invalid key
    if (ch === 27 || (!dir && c !== '.' && c !== '>' && c !== '<')) return 0;

    // cf. sounds.c:1296 — vertical directions not valid for chat
    if (c === '>' || c === '<') {
        await display.putstr_message("You can't do that in that direction.");
        return 0;
    }

    // Self-direction ('.'): talking to yourself
    if (!dir || (dir[0] === 0 && dir[1] === 0)) {
        await display.putstr_message('Talking to yourself is a bad habit for a dungeoneer.');
        return 0;
    }

    const tx = player.x + dir[0];
    const ty = player.y + dir[1];

    // cf. sounds.c:1412 — find a monster at the target cell
    const mon = (typeof map.monsterAt === 'function') ? map.monsterAt(tx, ty) : null;

    if (!mon) {
        // cf. sounds.c:1426 — tiphat / no one there
        await display.putstr_message('There is nobody here to talk to.');
        return 0;
    }

    // cf. sounds.c:1352 — call domonnoise for the monster's response
    await domonnoise(mon, game);
    return 1;
}

// cf. sounds.c:1412 — responsive_mon_at(x, y): find monster at pos for chat
export function responsive_mon_at(x, y, map) {
    if (typeof map.monsterAt === 'function') return map.monsterAt(x, y);
    return null;
}

// cf. sounds.c:1426 — tiphat(): hat-tip when nothing to chat with
export function tiphat(game) {
    // Stub
    return 0;
}

// ============================================================================
// Sound backend compatibility surface (cf. sounds.c NOSOUND/soundlib helpers)
// ============================================================================

const _soundMappings = [];
const _soundLibs = ['nosound', 'browser'];
let _activeSoundLib = 'browser';

// cf. sounds.c:1257 — dochat(): historical alias of dotalk()
export async function dochat(game) {
    return await dotalk(game);
}

// cf. sounds.c:1629 — sound_matches_message()
export function sound_matches_message(message, pattern) {
    const msg = String(message ?? '').toLowerCase();
    const pat = String(pattern ?? '').toLowerCase();
    if (!pat) return false;
    return msg.includes(pat);
}

// cf. sounds.c:1556 — add_sound_mapping()
export function add_sound_mapping(pattern, soundName) {
    if (!pattern || !soundName) return 0;
    _soundMappings.push({ pattern: String(pattern), soundName: String(soundName) });
    return 1;
}

// cf. sounds.c:1676 — release_sound_mappings()
export function release_sound_mappings() {
    _soundMappings.length = 0;
}

// cf. sounds.c:1642 — play_sound_for_message()
export function play_sound_for_message(message, game = null) {
    for (const m of _soundMappings) {
        if (sound_matches_message(message, m.pattern)) {
            maybe_play_sound(m.soundName, game);
            return 1;
        }
    }
    return 0;
}

// cf. sounds.c:1659 — maybe_play_sound()
export function maybe_play_sound(soundName, game = null) {
    const lib = String(_activeSoundLib || '').toLowerCase();
    if (lib === 'nosound') return 0;
    if (game && typeof game.playSound === 'function') {
        game.playSound(soundName);
        return 1;
    }
    return 0;
}

// cf. sounds.c:2084 — base_soundname_to_filename()
export function base_soundname_to_filename(baseName) {
    const base = String(baseName ?? '').trim();
    if (!base) return '';
    return `sounds/${base}.ogg`;
}

// cf. sounds.c:1995 — get_sound_effect_filename()
export function get_sound_effect_filename(effectName) {
    return base_soundname_to_filename(effectName);
}

// cf. sounds.c:1981 — initialize_semap_basenames()
export function initialize_semap_basenames() {
    return;
}

// cf. sounds.c:1883 — soundlib_id_from_opt()
export function soundlib_id_from_opt(opt) {
    const key = String(opt ?? '').toLowerCase();
    const idx = _soundLibs.findIndex((n) => n === key);
    return idx >= 0 ? idx : 0;
}

// cf. sounds.c:1864 — get_soundlib_name()
export function get_soundlib_name(idx) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= _soundLibs.length) return _soundLibs[0];
    return _soundLibs[idx];
}

// cf. sounds.c:1809 — choose_soundlib()
export function choose_soundlib(nameOrId) {
    if (Number.isInteger(nameOrId)) {
        _activeSoundLib = get_soundlib_name(nameOrId);
    } else {
        const id = soundlib_id_from_opt(nameOrId);
        _activeSoundLib = get_soundlib_name(id);
    }
    return _activeSoundLib;
}

// cf. sounds.c:1798 — assign_soundlib()
export function assign_soundlib(nameOrId) {
    return choose_soundlib(nameOrId);
}

// cf. sounds.c:1779 — activate_chosen_soundlib()
export function activate_chosen_soundlib() {
    return _activeSoundLib;
}

// cf. sounds.c NOSOUND hooks
export function nosound_init_nhsound() {
    return 1;
}
export function nosound_exit_nhsound() {
    return;
}
export function nosound_soundeffect(_effect) {
    return 0;
}
export function nosound_hero_playnotes(_notes) {
    return 0;
}
export function nosound_play_usersound(_name) {
    return 0;
}
export function nosound_verbal(_who, _what) {
    return 0;
}
export function nosound_achievement(_key) {
    return 0;
}
export function nosound_ambience(_key) {
    return 0;
}

// ============================================================================
// Sound library stubs (N/A for browser port)
// ============================================================================

// cf. sounds.c:2160 — set_voice(): configure voice for verbalize (N/A)
// Autotranslated from sounds.c:2160
export function set_voice(mtmp, tone, volume, moreinfo) {
}

// cf. sounds.c:2184 — sound_speak(): speak text with voice settings (N/A)
// Autotranslated from sounds.c:2184
export function sound_speak(text) {
}
