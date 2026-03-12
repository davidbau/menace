# Theme: spells-reads-zaps

Status: active

Target codepaths:
- `js/spell.js`: known-spells menu (`+`), spell-sort submenu (`+` from spell list), cast prompt branches
- `js/read.js`: scroll/spellbook command paths used by replayed C sessions
- `js/zap.js`: wand utility/ray paths already covered by existing theme sessions

Session plan:
1. Keep short deterministic wizard sessions for cast/read/zap paths.
2. Add parity-green sessions that measurably increase `js/spell.js` coverage.
3. Prefer sessions with unique codepath gain over redundant long runs.

Accepted sessions:
1. `t05_s692_w_cast_gp.session.json`
2. `t05_s695_w_castb_gp.session.json`
3. `t05_s696_w_reada_gp.session.json`
4. `t05_s698_w_spsort_gp.session.json` (`++a` sort-menu flow from known spells)
5. `t05_s699_w_spsortz_gp.session.json` (`++z` reassign-casting-letters path)
6. `t05_s700_w_spsortesc_gp.session.json` (`++Esc` cancel sort submenu and return to known spells)
7. `t05_s701_w_spsortsp_gp.session.json` (`++Space` cancel sort submenu and return to known spells)
8. `t05_s702_w_spsortbad_gp.session.json` (`++x a` ignore invalid sort key, then select valid sort)
9. `t05_s703_w_spsorth_gp.session.json` (`++h` maintain current ordering)
10. `t05_s704_w_spsortenter_gp.session.json` (`++Enter` cancel sort submenu and return to known spells)
11. `t05_s710_w_spsortb_gp.session.json` (`++b` sort alphabetically)
12. `t05_s705_w_spsortc_gp.session.json` (`++c` sort by level, low to high)
13. `t05_s706_w_spsortd_gp.session.json` (`++d` sort by level, high to low)
14. `t05_s711_w_spsorte_gp.session.json` (`++e` sort by skill group, alphabetized)
15. `t05_s708_w_spsortf_gp.session.json` (`++f` sort by skill group, low level first)
16. `t05_s709_w_spsortg_gp.session.json` (`++g` sort by skill group, high level first)
17. `t05_s712_v_nospell_gp.session.json` (`+` with no known spells)
18. `t06_s620_w_qheal_gp.session.json`
19. `t06_s621_w_qstat_gp.session.json`
20. `t06_s622_w_qabil_gp.session.json`
21. `t06_s623_w_qmisc_gp.session.json`
22. `t06_s624_w_qstat2_gp.session.json`
23. `t06_s625_w_qener_gp.session.json`
24. `t06_s631_w_zutil_gp.session.json`

Coverage impact (2026-03-12 refresh):
1. Overall parity coverage: lines `53.20% -> 53.28%` (`+0.08`), functions `34.72% -> 34.81%` (`+0.09`).
2. `js/spell.js`: lines `41.98% -> 48.84%` (`+6.86`), functions `26.15% -> 33.82%` (`+7.67`).

Issue links:
- Theme tracker: https://github.com/davidbau/menace/issues/347

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
