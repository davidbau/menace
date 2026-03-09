# CODEMATCH Gameplay 50-Slice Progress

Tracker issue: #280
Plan: [CODEMATCH_GAMEPLAY_50_SLICE_PLAN.md](CODEMATCH_GAMEPLAY_50_SLICE_PLAN.md)

Use this as the coordination board for slice claims and completion evidence.

Rules
- Claim by adding `agent:*` label on the slice issue.
- Keep at most one active slice issue per agent.
- Close issue only after CODEMATCH+LORE updates and validation evidence are posted.

## Slice Board

| Slice | Issue | Scope | Status |
|---|---|---|---|
| S01 | [#281](https://github.com/davidbau/menace/issues/281) | allmain.c turn loop parity | `Ready` |
| S02 | [#282](https://github.com/davidbau/menace/issues/282) | cmd.c dispatch core parity | `Ready` |
| S03 | [#283](https://github.com/davidbau/menace/issues/283) | cmd.c extended command parity | `Ready` |
| S04 | [#284](https://github.com/davidbau/menace/issues/284) | options.c parse/apply parity | `Ready` |
| S05 | [#285](https://github.com/davidbau/menace/issues/285) | options.c UI/persistence parity | `Ready` |
| S06 | [#286](https://github.com/davidbau/menace/issues/286) | botl.c full statusline parity | `Ready` |
| S07 | [#287](https://github.com/davidbau/menace/issues/287) | attrib.c core math parity | `Ready` |
| S08 | [#288](https://github.com/davidbau/menace/issues/288) | attrib.c innate+exercise parity | `Ready` |
| S09 | [#289](https://github.com/davidbau/menace/issues/289) | role.c selection parity | `Done` (Hello, Goodbye, plnamesuffix, role_init, genl_player_setup) |
| S10 | [#290](https://github.com/davidbau/menace/issues/290) | u_init.c startup edge parity | `Ready` |
| S11 | [#291](https://github.com/davidbau/menace/issues/291) | do_name.c naming flow parity | `Ready` |
| S12 | [#292](https://github.com/davidbau/menace/issues/292) | objnam.c remaining naming parity | `Done` (ledger) |
| S13 | [#293](https://github.com/davidbau/menace/issues/293) | invent.c getobj/askchain parity | `Ready` |
| S14 | [#294](https://github.com/davidbau/menace/issues/294) | invent.c organize/perminv/id parity | `Ready` |
| S15 | [#295](https://github.com/davidbau/menace/issues/295) | pickup.c floor pickup parity | `Ready` |
| S16 | [#296](https://github.com/davidbau/menace/issues/296) | pickup.c container loot parity | `Ready` |
| S17 | [#297](https://github.com/davidbau/menace/issues/297) | do_wear.c wear/takeoff edge parity | `Done` (armoroff, accessory_or_armor_on, ia_dotakeoff, afternmv) |
| S18 | [#298](https://github.com/davidbau/menace/issues/298) | wield.c wield/swap/quiver parity | `Done` (ledger) |
| S19 | [#299](https://github.com/davidbau/menace/issues/299) | weapon.c skill progression parity | `Done` (ledger) |
| S20 | [#300](https://github.com/davidbau/menace/issues/300) | apply.c tools family A parity | `Ready` |
| S21 | [#301](https://github.com/davidbau/menace/issues/301) | apply.c tools family B parity | `Ready` |
| S22 | [#302](https://github.com/davidbau/menace/issues/302) | apply.c tools family C parity | `Ready` |
| S23 | [#303](https://github.com/davidbau/menace/issues/303) | eat.c edible resolution parity | `Ready` |
| S24 | [#304](https://github.com/davidbau/menace/issues/304) | eat.c tin/tinning parity | `Ready` |
| S25 | [#305](https://github.com/davidbau/menace/issues/305) | potion.c dodrink->peffects parity | `Ready` |
| S26 | [#307](https://github.com/davidbau/menace/issues/307) | potion.c throw/dip/mix parity | `Ready` |
| S27 | [#308](https://github.com/davidbau/menace/issues/308) | read.c integration parity | `Ready` |
| S28 | [#309](https://github.com/davidbau/menace/issues/309) | zap.c floor interaction parity | `Done` (ledger) |
| S29 | [#310](https://github.com/davidbau/menace/issues/310) | zap.c self/monster matrix parity | `Done` (ledger) |
| S30 | [#311](https://github.com/davidbau/menace/issues/311) | trap.c dotrap core parity | `Ready` |
| S31 | [#312](https://github.com/davidbau/menace/issues/312) | trap.c advanced player effects parity | `Ready` |
| S32 | [#313](https://github.com/davidbau/menace/issues/313) | hack.c movement/rush parity | `Done` (ledger) |
| S33 | [#314](https://github.com/davidbau/menace/issues/314) | hack.c travel parity | `Done` (ledger) |
| S34 | [#315](https://github.com/davidbau/menace/issues/315) | mon.c lifecycle parity | `Ready` |
| S35 | [#316](https://github.com/davidbau/menace/issues/316) | mondata.c predicate parity | `Done` (121f9695) |
| S36 | [#317](https://github.com/davidbau/menace/issues/317) | monmove.c postmove edge parity | `Done` (bee_eat_jelly, m_arrival, soko_allow_web, stuff_prevents_passage, vamp_shift) |
| S37 | [#318](https://github.com/davidbau/menace/issues/318) | dog.c pet transfer parity | `Done` (newedog, initedog, tamedog, wary_dog, keep_mon_accessible, discard_migrations) |
| S38 | [#319](https://github.com/davidbau/menace/issues/319) | dogmove.c remaining AI parity | `Done` (ledger) |
| S39 | [#320](https://github.com/davidbau/menace/issues/320) | mhitu.c special attack parity | `Done` (cloneu, gulp_blnd_check, mon_avoiding_this_attack, mtrapped_in_pit) |
| S40 | [#321](https://github.com/davidbau/menace/issues/321) | uhitm.c hero attack parity | `Done` (do_stone_u, do_stone_mon) |
| S41 | [#322](https://github.com/davidbau/menace/issues/322) | mhitm.c monster-vs-monster parity | `Done` (ledger) |
| S42 | [#323](https://github.com/davidbau/menace/issues/323) | mthrowu+mcastu ranged parity | `Done` (ledger) |
| S43 | [#324](https://github.com/davidbau/menace/issues/324) | muse.c item-use AI parity | `Done` (ledger) |
| S44 | [#325](https://github.com/davidbau/menace/issues/325) | dungeon.c graph/branch parity | `Ready` |
| S45 | [#326](https://github.com/davidbau/menace/issues/326) | mklev+mkroom generation parity | `Done` (ledger) |
| S46 | [#327](https://github.com/davidbau/menace/issues/327) | mkmaze+mkmap generation parity | `Done` (ledger) |
| S47 | [#328](https://github.com/davidbau/menace/issues/328) | display.c mapglyph/windowport parity | `Ready` |
| S48 | [#329](https://github.com/davidbau/menace/issues/329) | vision.c remaining helper parity | `Done` (ledger) |
| S49 | [#330](https://github.com/davidbau/menace/issues/330) | light.c light-source parity | `Ready` |
| S50 | [#331](https://github.com/davidbau/menace/issues/331) | shk.c shopkeeper parity | `Ready` |

## Summary

- Total slices: 50
- Open slices: 29
- Completed slices: 21 (S09, S12, S17, S18, S19, S28, S29, S32, S33, S35, S36, S37, S38, S39, S40, S41, S42, S43, S45, S46, S48)
