#!/usr/bin/env python3
"""Create Codex-played wizard sessions for seeds 321..333 (one per class).

Each run performs a scripted wizard setup (^W wishes, gear, ^V deep teleport),
then hands control to the selfplay agent for ~200 turns of adaptive play.
"""

import base64
import argparse
import json
import os
import random
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
KEYLOG_DIR = PROJECT_ROOT / 'test' / 'comparison' / 'keylogs'
SESSIONS_DIR = PROJECT_ROOT / 'test' / 'comparison' / 'sessions'
DOC_PATH = PROJECT_ROOT / 'docs' / 'SESSION_CAPTURE_3XX_OPTIONS.md'
INSTALL_DIR = PROJECT_ROOT / 'nethack-c' / 'install' / 'games' / 'lib' / 'nethackdir'
FIXED_DATETIME = '20000110090000'

CLASSES = [
    ('archeologist', 'Archeologist', 321),
    ('barbarian', 'Barbarian', 322),
    ('caveman', 'Caveman', 323),
    ('healer', 'Healer', 324),
    ('knight', 'Knight', 325),
    ('monk', 'Monk', 326),
    ('priest', 'Priest', 327),
    ('ranger', 'Ranger', 328),
    ('rogue', 'Rogue', 329),
    ('samurai', 'Samurai', 330),
    ('tourist', 'Tourist', 331),
    ('valkyrie', 'Valkyrie', 332),
    ('wizard', 'Wizard', 333),
]

# Class-specific wish pools; selection is deterministic from session seed.
WISH_POOLS = {
    'archeologist': ['blessed +2 elven mithril-coat', 'blessed +3 speed boots', 'wand of teleportation', 'blessed bag of holding', 'ring of teleport control'],
    'barbarian': ['blessed +3 gray dragon scale mail', 'blessed +2 battle-axe', 'blessed +3 gauntlets of power', 'wand of death', 'blessed amulet of life saving'],
    'caveman': ['blessed +2 crystal plate mail', 'blessed +2 helm of telepathy', 'blessed unicorn horn', 'wand of cold', 'blessed ring of conflict'],
    'healer': ['blessed +2 cloak of magic resistance', 'blessed ring of free action', 'blessed crystal ball', 'wand of digging', 'blessed amulet of ESP'],
    'knight': ['blessed +3 gray dragon scale mail', 'blessed +3 speed boots', 'blessed +2 long sword', 'blessed amulet of reflection', 'wand of wishing'],
    'monk': ['blessed +2 cloak of invisibility', 'blessed +2 jumping boots', 'ring of invisibility', 'amulet of magical breathing', 'blessed magic marker'],
    'priest': ['blessed +3 silver dragon scale mail', 'blessed +3 helm of brilliance', 'blessed +2 oilskin cloak', 'wand of lightning', 'ring of see invisible'],
    'ranger': ['blessed +2 elven cloak', 'blessed +2 elven boots', 'blessed +2 elven dagger', 'wand of fire', 'ring of levitation'],
    'rogue': ['blessed +3 gray dragon scale mail', 'blessed +2 cloak of displacement', 'blessed +0 pick-axe', 'wand of polymorph', 'ring of regeneration'],
    'samurai': ['blessed +2 red dragon scale mail', 'blessed +2 katana', 'blessed +3 speed boots', 'blessed +2 helm of telepathy', 'wand of death'],
    'tourist': ['blessed +3 gray dragon scale mail', 'blessed +3 speed boots', 'blessed +3 helm of brilliance', 'blessed +3 gauntlets of power', 'blessed bag of holding'],
    'valkyrie': ['blessed +3 silver dragon scale mail', 'blessed +2 water walking boots', 'blessed +3 gauntlets of power', 'ring of fire resistance', 'wand of cold'],
    'wizard': ['blessed +2 cloak of magic resistance', 'ring of teleport control', 'wand of wishing', 'blessed scroll of charging', 'blessed magic marker'],
}


def clean_state():
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
            try:
                p.unlink()
            except FileNotFoundError:
                pass


def classify_item(item):
    lo = item.lower()
    if 'boots' in lo:
        return 'boots'
    if 'helm' in lo or 'cornuthaum' in lo or 'dunce cap' in lo:
        return 'helm'
    if 'gauntlets' in lo or lo.endswith('gloves'):
        return 'gloves'
    if 'cloak' in lo:
        return 'cloak'
    if 'mail' in lo or 'coat' in lo or 'plate' in lo:
        return 'armor'
    if lo.startswith('ring'):
        return 'ring'
    if lo.startswith('amulet'):
        return 'amulet'
    if lo.startswith('wand'):
        return 'wand'
    if lo.startswith('scroll'):
        return 'scroll'
    if lo.startswith('potion'):
        return 'potion'
    if any(w in lo for w in ['sword', 'katana', 'axe', 'dagger', 'mattock', 'saber', 'crysknife']):
        return 'weapon'
    return 'tool'


def equip_cmd(kind, letter):
    if kind in ('armor', 'boots', 'helm', 'gloves', 'cloak'):
        return f'W{letter}'
    if kind in ('amulet', 'ring'):
        return f'P{letter}'
    if kind == 'weapon':
        return f'w{letter}'
    return ''


def build_setup(slug, seed):
    rng = random.Random(seed)
    potions = rng.randint(6, 20)
    teleport_level = rng.randint(9, 25)

    wishes = list(WISH_POOLS[slug])
    rng.shuffle(wishes)
    wishes = wishes[:5]

    moves = []
    # Wish + quaff random potions of gain level.
    moves.append('\x17')
    moves.append(f'{potions} blessed potions of gain level\n')
    moves.append('qa' * potions)

    item_letters = {}
    letter_ord = ord('b')
    for item in wishes:
        letter = chr(letter_ord)
        item_letters[item] = letter
        letter_ord += 1
        moves.append('\x17')
        moves.append(item)
        moves.append('\n')

    for item in wishes:
        kind = classify_item(item)
        letter = item_letters[item]
        cmd = equip_cmd(kind, letter)
        if cmd:
            moves.append(cmd)

    # Teleport deep; agent will take over and play from there.
    moves.append('\x16')
    moves.append(f'{teleport_level}\n')

    return ''.join(moves), {
        'potions': potions,
        'teleport_level': teleport_level,
        'wishes': wishes,
    }


def build_options(role: str):
    return [
        'OPTIONS=name:Recorder',
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


def upsert_doc(entries):
    lines = DOC_PATH.read_text().splitlines() if DOC_PATH.exists() else []
    if not lines:
        lines = [
            '# Session Capture Options (3xx/32x)',
            '',
            'This file records the exact NetHack option settings used for newly-captured sessions.',
            '',
        ]

    def replace_section(lines, header, content_lines):
        if header not in lines:
            if lines and lines[-1] != '':
                lines.append('')
            lines.append(header)
            lines.append('')
            lines.extend(content_lines)
            return lines
        start = lines.index(header)
        next_headers = [i for i, ln in enumerate(lines[start + 1:], start + 1) if ln.startswith('## ')]
        end = next_headers[0] if next_headers else len(lines)
        return lines[:start + 2] + content_lines + lines[end:]

    section = []
    for e in entries:
        section.append(f"- `seed{e['seed']}_{e['slug']}_wizard_gameplay.session.json`")
        section.append(f"  - runner: `node selfplay/runner/run_wizard_agent_session.js --seed={e['seed']} --role={e['role']} --agent-turns=200 ...`")
        section.append(f"  - plan: potions={e['plan']['potions']} teleport=Dlvl:{e['plan']['teleport_level']} wishes={', '.join(e['plan']['wishes'])}")
        section.append('  - options:')
        for opt in e['options']:
            section.append(f'    - `{opt}`')

    lines = replace_section(lines, '## 321..333 Scripted-Manual Wizard Sessions', section)
    DOC_PATH.write_text('\n'.join(lines).rstrip() + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--start-seed', type=int, default=321)
    ap.add_argument('--end-seed', type=int, default=333)
    args = ap.parse_args()

    KEYLOG_DIR.mkdir(parents=True, exist_ok=True)
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

    entries = []

    for slug, role, seed in CLASSES:
        if seed < args.start_seed or seed > args.end_seed:
            continue
        clean_state()

        keylog = KEYLOG_DIR / f'seed{seed}_{slug}_wizard_manual.jsonl'
        out_session = SESSIONS_DIR / f'seed{seed}_{slug}_wizard_gameplay.session.json'

        setup_keys, plan = build_setup(slug, seed)
        setup_b64 = base64.b64encode(setup_keys.encode('utf-8')).decode('ascii')
        options = build_options(role)
        env = os.environ.copy()
        env['NETHACK_FIXED_DATETIME'] = FIXED_DATETIME
        env['NETHACK_NO_DELAY'] = '1'

        run_cmd([
            'node', 'selfplay/runner/run_wizard_agent_session.js',
            f'--seed={seed}',
            f'--role={role}',
            '--race=human',
            '--gender=female',
            '--align=neutral',
            '--name=Recorder',
            '--symset=DECgraphics',
            '--key-delay=40',
            '--agent-turns=200',
            f'--session=wizard-agent-{seed}',
            '--tmux-socket=default',
            f'--keylog={keylog}',
            f'--setup-base64={setup_b64}',
        ], env=env)

        run_cmd([
            'python3', 'test/comparison/c-harness/keylog_to_session.py',
            f'--in={keylog}',
            f'--out={out_session}',
            '--seed', str(seed),
            '--name=Recorder',
            f'--role={role}',
            '--race=human',
            '--gender=female',
            '--align=neutral',
            '--symset=DECgraphics',
            '--wizard=on',
            '--tutorial=off',
            '--startup-mode=auto',
            '--screen-capture=ansi',
        ])

        entries.append({
            'seed': seed,
            'slug': slug,
            'role': role,
            'plan': plan,
            'options': options,
        })

    if entries:
        upsert_doc(entries)
    print(f'Completed scripted-manual wizard session capture for seeds {args.start_seed}..{args.end_seed}.')


if __name__ == '__main__':
    main()
