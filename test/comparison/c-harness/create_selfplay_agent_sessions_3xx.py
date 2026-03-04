#!/usr/bin/env python3
"""Create non-wizard selfplay-agent sessions for seeds 301..313 (one per class).

Workflow:
1. Run selfplay/runner/c_runner.js with --no-wizard and C key logging enabled.
2. Convert keylog JSONL to canonical comparison session JSON.
3. Record exact NetHack OPTIONS used for each session.
"""

import argparse
import json
import os
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
KEYLOG_DIR = PROJECT_ROOT / 'test' / 'comparison' / 'keylogs'
SESSIONS_DIR = PROJECT_ROOT / 'test' / 'comparison' / 'sessions'
DOC_PATH = PROJECT_ROOT / 'docs' / 'SESSION_CAPTURE_3XX_OPTIONS.md'
INSTALL_DIR = PROJECT_ROOT / 'nethack-c' / 'install' / 'games' / 'lib' / 'nethackdir'
FIXED_DATETIME = '20000110090000'

CLASSES = [
    ('archeologist', 'Archeologist', 301),
    ('barbarian', 'Barbarian', 302),
    ('caveman', 'Caveman', 303),
    ('healer', 'Healer', 304),
    ('knight', 'Knight', 305),
    ('monk', 'Monk', 306),
    ('priest', 'Priest', 307),
    ('ranger', 'Ranger', 308),
    ('rogue', 'Rogue', 309),
    ('samurai', 'Samurai', 310),
    ('tourist', 'Tourist', 311),
    ('valkyrie', 'Valkyrie', 312),
    ('wizard', 'Wizard', 313),
]


def clean_state():
    # Keep this narrow and deterministic: save files, scores/logs, bones, and player leftovers.
    save_dir = INSTALL_DIR / 'save'
    if save_dir.is_dir():
        for p in save_dir.iterdir():
            if p.is_file():
                p.unlink()
    explicit_runtime_files = {'record', 'xlogfile', 'logfile', 'paniclog'}
    for p in INSTALL_DIR.iterdir():
        if not p.is_file() or p.suffix == '.lua':
            continue
        n = p.name.lower()
        if (
            n in explicit_runtime_files
            or n.startswith('bon')
            or 'agent' in n
            or 'wizard' in n
            or 'recorder' in n
        ):
            p.unlink()


def build_options(role: str):
    return [
        'OPTIONS=name:Agent',
        'OPTIONS=race:human',
        f'OPTIONS=role:{role}',
        'OPTIONS=gender:female',
        'OPTIONS=align:neutral',
        'OPTIONS=showexp',
        'OPTIONS=!autopickup',
        'OPTIONS=suppress_alert:3.4.3',
        'OPTIONS=!tutorial',
        'OPTIONS=symset:DECgraphics',
    ]


def run_cmd(cmd, env=None):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, check=True, env=env)


def append_doc(entries):
    lines = []
    if DOC_PATH.exists():
        lines = DOC_PATH.read_text().splitlines()
    if not lines:
        lines = [
            '# Session Capture Options (3xx/32x)',
            '',
            'This file records the exact NetHack option settings used for newly-captured sessions.',
            '',
            '## 301..313 Non-Wizard Selfplay Agent',
            '',
        ]
    if '## 301..313 Non-Wizard Selfplay Agent' not in lines:
        lines += ['', '## 301..313 Non-Wizard Selfplay Agent', '']
    start = lines.index('## 301..313 Non-Wizard Selfplay Agent')
    # Truncate old section content if present.
    next_headers = [i for i, ln in enumerate(lines[start + 1:], start + 1) if ln.startswith('## ')]
    end = next_headers[0] if next_headers else len(lines)
    section = ['## 301..313 Non-Wizard Selfplay Agent', '']
    for e in entries:
        section.append(f"- `seed{e['seed']}_{e['slug']}_selfplay200_gameplay.session.json`")
        section.append(f"  - runner: `node selfplay/runner/c_runner.js --seed={e['seed']} --turns=200 --role={e['role']} --graphics=dec --no-wizard --quiet`")
        section.append('  - options:')
        for opt in e['options']:
            section.append(f'    - `{opt}`')
    new_lines = lines[:start] + section + lines[end:]
    DOC_PATH.write_text('\n'.join(new_lines).rstrip() + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--start-seed', type=int, default=301)
    ap.add_argument('--end-seed', type=int, default=313)
    args = ap.parse_args()

    KEYLOG_DIR.mkdir(parents=True, exist_ok=True)
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

    entries = []

    for slug, role, seed in CLASSES:
        if seed < args.start_seed or seed > args.end_seed:
            continue
        clean_state()

        keylog = KEYLOG_DIR / f'seed{seed}_{slug}_selfplay200.jsonl'
        out_session = SESSIONS_DIR / f'seed{seed}_{slug}_selfplay200_gameplay.session.json'
        options = build_options(role)
        meta = {
            'type': 'meta',
            'seed': seed,
            'role': role,
            'race': 'human',
            'gender': 'female',
            'align': 'neutral',
            'name': 'Agent',
            'wizard': False,
            'tutorial': False,
            'symset': 'DECgraphics',
            'datetime': FIXED_DATETIME,
            'keylogDelayMs': 0,
            'nethackOptions': options,
            'generator': 'create_selfplay_agent_sessions_3xx.py',
        }
        keylog.write_text(json.dumps(meta) + '\n')

        env = os.environ.copy()
        env['NETHACK_KEYLOG'] = str(keylog)
        env['NETHACK_KEYLOG_DELAY_MS'] = '0'
        env['NETHACK_FIXED_DATETIME'] = FIXED_DATETIME
        env['NETHACK_NO_DELAY'] = '1'

        run_cmd([
            'node', 'selfplay/runner/c_runner.js',
            f'--seed={seed}',
            '--turns=200',
            f'--role={role}',
            '--graphics=dec',
            '--no-wizard',
            '--quiet',
        ], env=env)

        run_cmd([
            'python3', 'test/comparison/c-harness/keylog_to_session.py',
            f'--in={keylog}',
            f'--out={out_session}',
            '--seed', str(seed),
            '--name=Agent',
            f'--role={role}',
            '--race=human',
            '--gender=female',
            '--align=neutral',
            '--symset=DECgraphics',
            '--wizard=off',
            '--tutorial=off',
            '--startup-mode=auto',
            '--screen-capture=ansi',
        ])

        entries.append({'seed': seed, 'slug': slug, 'role': role, 'options': options})

    if entries:
        append_doc(entries)
    print(f'Completed selfplay agent session capture for seeds {args.start_seed}..{args.end_seed}.')


if __name__ == '__main__':
    main()
