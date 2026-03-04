# NetHack 3.7 Strategy Updates

This is a supplement for experienced players returning from 3.6.x-era play.
It focuses on strategic implications, not basic mechanics.

For baseline game knowledge, see `spoilers/guide.md`.

## Old Tricks That No Longer Work

1. Wand of speed monster no longer grants permanent speed on self-zap.
   Strategy: treat it as a tactical tempo tool (short burst), not a build-enabler.
   Source: `nethack-c/patched/src/zap.c` (`speed_up(rn1(25, 50))`).

2. Wand of make invisible no longer grants permanent invisibility on self-zap.
   Strategy: use it for tactical windows only; build permanent invis from gear/intrinsic routes.
   Source: `nethack-c/patched/src/zap.c` (`incr_itimeout(&HInvis, rn1(15, 31))`).

3. Weak-sacrifice luck ramping is capped by corpse value.
   Strategy: once luck is above corpse difficulty, that sacrifice no longer raises luck.
   Source: `nethack-c/patched/src/pray.c` (`if (orig_luck > value) luck_increase = 0`).

## High-Impact New Tactics

1. Peaceful displacement is now a pathing tool.
   Strategy: route through crowded peaceful zones instead of forcing attack decisions.
   Limits: no displacing into unsafe/trapped terrain; key peaceful NPCs are excluded.
   Source: `nethack-c/patched/src/hack.c` (peaceful displacement safety checks and swap path).

2. Blessed polymorph potion gives controlled polyself.
   Strategy: treat one blessed polymorph potion as a self-contained power spike.
   Use it to hit short, objective-focused windows (escape, spike damage, resist coverage).

3. Vampire form-switching is much more practical.
   Strategy: use bat/fog/vampire forms for movement-combat cycling rather than committing.
   Practical loop: reposition in mobility form, return to combat form for kills.

4. Monsters can actively loot containers.
   Strategy: do not leave critical stash chests exposed on contested floors.
   This matters at the Castle and other loot-dense transitions.
   Source: `nethack-c/patched/src/muse.c` (`MUSE_BAG`, `mloot_container`).

5. Monsters using undead turning can punish corpse-carrying.
   Strategy: stop carrying high-risk corpses in open inventory around casters.
   Keep corpse plans short and local.
   Source: `nethack-c/patched/src/muse.c` (`MUSE_WAN_UNDEAD_TURNING`, corpse checks).

## Positioning and Fight-Flow Changes

1. Ranged hostiles now preserve distance more intentionally.
   Strategy: corners, obstruction, and ranged answers are mandatory more often.
   Closing to melee is less reliable as a universal answer.
   Source: `nethack-c/patched/src/monmove.c` ("hostiles with ranged weapon or attack try to stay away").

2. Fear-based control is less farmable when enemies are cornered.
   Strategy: do not assume scared targets are passive free hits in tight spaces.
   Keep escape lanes and finishing plans.
   Source trail: `nethack-c/patched/src/monmove.c` (`distfleeck` + scared handling paths).

## Economy and Resource Routing Changes

1. Diluted-stack alchemy is nerfed.
   Strategy: large diluted stacks are no longer a high-throughput conversion path.
   Plan on smaller, higher-value conversions.
   Source: `nethack-c/patched/src/potion.c` (diluted dips capped to `amt = 2`).

2. Gehennom hot ground destroys dropped potions at meaningful rates.
   Strategy: floor-stashing potions in Gehennom is now materially unsafe.
   Keep potions in inventory/containers; avoid casual drops while juggling.
   Source: `nethack-c/patched/src/do.c` (temperature + potion shatter logic).

3. Ring of aggravate monster is now a deliberate risk dial.
   Strategy: use intentionally for spawn pressure only with immediate tactical intent.
   New behavior is stronger than "just slightly harder spawns": level difficulty is scaled.
   Source: `nethack-c/patched/src/dungeon.c` (`if (EAggravate_monster) res = res > 25 ? 50 : res * 2;`).

## Sustain and Recovery Updates

1. Amulet of restful sleep is no longer dead weight in controlled environments.
   Strategy: in secured positions, sleep-based recovery is now a valid reset tactic.
   It stacks into regen logic while asleep.
   Source: `nethack-c/patched/src/allmain.c` (`Sleepy && u.usleep` adds extra healing).

## Role-Specific Strategic Shifts

1. Wizards gain systematic spellbook appearance ID by school skill.
   Strategy: training spell schools has direct identification value now, not just cast success value.
   Prioritize schools tied to your midgame book bottlenecks.
   Source: `nethack-c/patched/src/spell.c` (`skill_based_spellbook_id`).

2. Demonbane now being silver mace shifts who uses it optimally.
   Strategy: mace-friendly roles gain relative value from first-artifact plans.
   Source: `nethack-c/patched/include/artilist.h` (`Demonbane`, `SILVER_MACE`).

## What To Change In Your 3.6.x Habits Immediately

1. Stop planning permanent speed/invisibility around self-zap wands.
2. Stop luck-grinding with low-value sacrifice fodder after early luck.
3. Stop leaving important containers unattended in active areas.
4. Stop carrying speculative corpse inventory through caster-heavy fights.
5. Stop relying on "walk into ranged threat and solve it in melee" as default.
6. Stop floor-stashing potions in Gehennom.

## Verification Notes

This document is strategy-first and source-anchored where practical.
Primary references in this repo:

1. `nethack-c/patched/src/zap.c`
2. `nethack-c/patched/src/pray.c`
3. `nethack-c/patched/src/hack.c`
4. `nethack-c/patched/src/monmove.c`
5. `nethack-c/patched/src/muse.c`
6. `nethack-c/patched/src/potion.c`
7. `nethack-c/patched/src/do.c`
8. `nethack-c/patched/src/dungeon.c`
9. `nethack-c/patched/src/allmain.c`
10. `nethack-c/patched/src/spell.c`
11. `nethack-c/patched/include/artilist.h`

