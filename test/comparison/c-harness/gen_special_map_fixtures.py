#!/usr/bin/env python3
"""Generate grouped special-level map fixtures with full variant coverage.

Produces files in test/comparison/maps:
  seed<N>_special_<group>.session.json

Unlike gen_special_sessions.py (per-level session capture), this script
builds grouped special fixtures used by the session test runner's special
suite and expands all variant configurations (nlevels + quest fila/filb).
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

from gen_special_sessions import LEVEL_GROUPS, QUEST_ROLE_BY_PREFIX

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
RUN_SESSION = os.path.join(SCRIPT_DIR, 'run_session.py')
MAPS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'maps')

QUEST_SUFFIX_ORDER = ['strt', 'loca', 'fila', 'filb', 'goal']


def expand_group_levels(group_name):
    base_levels = LEVEL_GROUPS[group_name]['levels']
    expanded = []

    if group_name == 'quest':
        present = {lvl['name']: lvl for lvl in base_levels}
        for prefix in QUEST_ROLE_BY_PREFIX.keys():
            for suffix in QUEST_SUFFIX_ORDER:
                name = f'{prefix}-{suffix}'
                lvl = present.get(name)
                if lvl is None:
                    if suffix in ('fila', 'filb'):
                        lvl = {'name': name, 'branch': 'The Quest'}
                    else:
                        continue
                expanded.append(dict(lvl))
        return expanded

    for lvl in base_levels:
        count = lvl.get('nlevels')
        if isinstance(count, int) and count > 1:
            for i in range(1, count + 1):
                lv = dict(lvl)
                lv['name'] = f"{lvl['name']}-{i}"
                expanded.append(lv)
        else:
            expanded.append(dict(lvl))
    return expanded


def quest_role_for_level(level_name):
    prefix = level_name.split('-')[0]
    role = QUEST_ROLE_BY_PREFIX.get(prefix)
    return role.lower() if role else None


def extract_level_payload(captured, level_name, level_def):
    steps = captured.get('steps') or []
    step = None
    for s in reversed(steps):
        if s.get('typGrid'):
            step = s
            break
    if step is None:
        raise RuntimeError(f"no typGrid captured for level '{level_name}'")

    payload = {
        'levelName': level_name,
        'branch': level_def.get('branch', ''),
        'typGrid': step.get('typGrid'),
    }
    if 'branchLevel' in level_def:
        payload['branchLevel'] = level_def['branchLevel']
    if 'nlevels' in level_def:
        payload['nlevels'] = level_def['nlevels']
    if step.get('checkpoints'):
        payload['checkpoints'] = step['checkpoints']
    return payload


def capture_level(seed, level_name, level_def):
    with tempfile.TemporaryDirectory(prefix='special-fixture-') as tmpdir:
        out = os.path.join(tmpdir, f'{level_name}.session.json')
        cmd = [
            sys.executable,
            RUN_SESSION,
            str(seed),
            out,
            '--wizload',
            level_name,
        ]
        role = quest_role_for_level(level_name)
        if role:
            cmd.extend(['--character', role])
        subprocess.run(cmd, check=True)
        with open(out, 'r', encoding='utf-8') as f:
            captured = json.load(f)
        return extract_level_payload(captured, level_name, level_def)


def write_fixture(seed, group_name, levels):
    os.makedirs(MAPS_DIR, exist_ok=True)
    out = os.path.join(MAPS_DIR, f'seed{seed}_special_{group_name}.session.json')
    session = {
        'version': 2,
        'seed': int(seed),
        'type': 'special',
        'source': 'c',
        'group': group_name,
        'screenMode': 'decgraphics',
        'levels': levels,
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(session, f, indent=2)
        f.write('\n')
    return out


def generate_group(group_name, seeds):
    expanded = expand_group_levels(group_name)
    for seed in seeds:
        print(f"\n[{group_name}] seed {seed} ({len(expanded)} levels)")
        levels = []
        for lvl in expanded:
            name = lvl['name']
            print(f"  - {name}")
            levels.append(capture_level(seed, name, lvl))
        out = write_fixture(seed, group_name, levels)
        print(f"  wrote {out}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('group', nargs='?', help='group name')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--seeds', default='1,42,100', help='comma-separated seeds')
    args = parser.parse_args()

    seeds = [int(s.strip()) for s in args.seeds.split(',') if s.strip()]

    if args.all:
        groups = list(LEVEL_GROUPS.keys())
    elif args.group:
        if args.group not in LEVEL_GROUPS:
            raise SystemExit(f"unknown group: {args.group}")
        groups = [args.group]
    else:
        raise SystemExit('specify <group> or --all')

    for g in groups:
        generate_group(g, seeds)


if __name__ == '__main__':
    main()
