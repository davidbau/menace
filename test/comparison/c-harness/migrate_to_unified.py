#!/usr/bin/env python3
"""Migrate session files to use the unified recorder (Gate 8B.3).

For each session:
1. Add !tutorial to nethackrc (if missing and session had auto-advance)
2. Prepend startup keys (--More-- spaces) to the key sequence
3. Re-record with record_c_session()
4. Compare against original on all channels

Usage:
    python3 migrate_to_unified.py [session_files...]
    python3 migrate_to_unified.py --all
    python3 migrate_to_unified.py --dry-run session.json
    python3 migrate_to_unified.py --probe session.json   # just show startup keys
"""

import sys
import os
import json
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')

sys.path.insert(0, SCRIPT_DIR)
from run_session import (
    record_c_session, probe_startup_keys, compact_session_json,
    parse_moves, _parse_name_from_nethackrc, _has_wizard_directive,
)


def ensure_tutorial_in_nethackrc(nethackrc):
    """Add !tutorial to nethackrc OPTIONS if not already present."""
    if '!tutorial' in nethackrc or 'tutorial:' in nethackrc.lower():
        return nethackrc
    # Find the first OPTIONS= line and append ,!tutorial
    lines = nethackrc.split('\n')
    for i, line in enumerate(lines):
        if line.strip().upper().startswith('OPTIONS='):
            lines[i] = line.rstrip() + ',!tutorial'
            return '\n'.join(lines)
    # No OPTIONS line found — add one
    return 'OPTIONS=!tutorial\n' + nethackrc


def extract_gameplay_keys(session):
    """Extract the gameplay key sequence from a session's steps."""
    keys = []
    for step in session.get('steps', []):
        if step.get('key') is not None:
            keys.append(step['key'])
    return keys


def extract_keys_from_regen(session):
    """Extract keys from regen.moves (compact notation) via parse_moves."""
    regen = session.get('regen', {})
    moves = regen.get('moves')
    if moves:
        parsed = parse_moves(moves)
        keys = []
        for key_seq, _ in parsed:
            keys.extend(list(key_seq))
        return keys
    return None


def analyze_session(session_path):
    """Analyze a session and determine migration plan."""
    with open(session_path) as f:
        session = json.load(f)

    name = os.path.basename(session_path)
    stype = session.get('type') or session.get('regen', {}).get('mode', 'unknown')
    nethackrc = session.get('nethackrc', '')
    env = session.get('env', {})
    regen = session.get('regen', {})

    # Determine existing keys
    step_keys = extract_gameplay_keys(session)
    regen_keys = extract_keys_from_regen(session)

    # Check nethackrc state
    has_tutorial = '!tutorial' in nethackrc
    has_role = 'role:' in nethackrc.lower()
    has_wizard = _has_wizard_directive(nethackrc)

    return {
        'path': session_path,
        'name': name,
        'type': stype,
        'env': env,
        'nethackrc': nethackrc,
        'regen': regen,
        'step_keys': step_keys,
        'regen_keys': regen_keys,
        'has_tutorial': has_tutorial,
        'has_role': has_role,
        'has_wizard': has_wizard,
        'steps': len(session.get('steps', [])),
        'session': session,
    }


def migrate_session(info, dry_run=False, probe_only=False):
    """Migrate a single session to the unified recorder format."""
    name = info['name']
    stype = info['type']
    env = info['env']
    nethackrc = info['nethackrc']

    # --- Determine the full key sequence ---

    if stype in ('gameplay', 'wizload', 'interface', 'option_test'):
        if not info['has_role']:
            print(f'  SKIP {name}: no role in nethackrc (needs manual handling)')
            return None

        # Add !tutorial if needed
        nethackrc = ensure_tutorial_in_nethackrc(nethackrc)

        # Probe for startup keys
        startup_keys = probe_startup_keys(env, nethackrc)

        if probe_only:
            print(f'  {name}: {len(startup_keys)} startup keys + {len(info["step_keys"])} gameplay keys')
            return None

        # Combine: startup + gameplay
        full_keys = startup_keys + info['step_keys']

        if dry_run:
            print(f'  {name} ({stype}): {len(startup_keys)} startup + {len(info["step_keys"])} gameplay = {len(full_keys)} total')
            return None

        # Record
        regen = dict(info['regen']) if info['regen'] else {}
        output_path = info['path']
        result = record_c_session(
            env, nethackrc, full_keys, output_path,
            key_delay_s=0.1,
            regen_metadata=regen,
            session_type=stype,
            verbose=True,
        )
        return result

    elif stype == 'chargen':
        # Chargen sessions need role/race/gender/align REMOVED from nethackrc
        # so the interactive chargen prompts appear.  The existing step keys
        # already include the chargen selections + --More-- spaces.
        # We just need to fix the nethackrc and prepend the initial lore --More--.
        chargen_rc_lines = []
        for line in nethackrc.split('\n'):
            stripped = line.strip()
            if stripped.upper().startswith('WIZARD='):
                continue  # Handled by -D flag
            if stripped.upper().startswith('OPTIONS='):
                # Remove role/race/gender/align from OPTIONS
                opts_part = stripped.split('=', 1)[1]
                kept = []
                for opt in opts_part.split(','):
                    opt_lower = opt.strip().lower()
                    if any(opt_lower.startswith(f'{k}:') for k in ('role', 'race', 'gender', 'align')):
                        continue
                    kept.append(opt.strip())
                if kept:
                    chargen_rc_lines.append('OPTIONS=' + ','.join(kept))
            else:
                if stripped:
                    chargen_rc_lines.append(stripped)
        chargen_nethackrc = '\n'.join(chargen_rc_lines) + '\n'
        # Add WIZARD back for JS side (will be stripped for C)
        if _has_wizard_directive(nethackrc):
            chargen_nethackrc += 'WIZARD=Wizard\n'

        # Probe for startup keys with the chargen nethackrc
        startup_keys = probe_startup_keys(env, chargen_nethackrc)

        if probe_only:
            print(f'  {name}: {len(startup_keys)} startup + {len(info["step_keys"])} chargen+gameplay keys')
            return None

        full_keys = startup_keys + info['step_keys']

        if dry_run:
            print(f'  {name} (chargen): {len(startup_keys)} startup + {len(info["step_keys"])} chargen = {len(full_keys)} total')
            print(f'    nethackrc: {repr(chargen_nethackrc[:80])}')
            return None

        regen = dict(info['regen']) if info['regen'] else {}
        result = record_c_session(
            env, chargen_nethackrc, full_keys, info['path'],
            key_delay_s=0.1,
            regen_metadata=regen,
            session_type=stype,
            verbose=True,
        )
        return result

    elif stype in ('manual-direct-live', 'keylog'):
        print(f'  SKIP {name}: manual/keylog sessions need separate handling')
        return None

    else:
        print(f'  SKIP {name}: unknown type {stype}')
        return None


def main():
    args = list(sys.argv[1:])
    dry_run = '--dry-run' in args
    probe_only = '--probe' in args
    do_all = '--all' in args

    args = [a for a in args if not a.startswith('--')]

    if do_all:
        session_files = sorted([
            os.path.join(SESSIONS_DIR, f)
            for f in os.listdir(SESSIONS_DIR)
            if f.endswith('.session.json')
        ])
    else:
        session_files = [os.path.abspath(a) for a in args]

    if not session_files:
        print("Usage: migrate_to_unified.py [--dry-run|--probe|--all] [session_files...]")
        sys.exit(1)

    print(f'Analyzing {len(session_files)} session(s)...\n')

    for path in session_files:
        info = analyze_session(path)
        migrate_session(info, dry_run=dry_run, probe_only=probe_only)


if __name__ == '__main__':
    main()
