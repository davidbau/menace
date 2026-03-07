#!/usr/bin/env python3
"""Convert a C keylog JSONL trace into standard C session JSON format.

Usage:
    python3 keylog_to_session.py --in seed5.jsonl --out test/comparison/sessions/seed5.session.json

This script replays recorded keycodes into C NetHack with the same seed and
captures:
  - startup RNG + screen + typGrid
  - per-step RNG deltas + screen + depth
  - typGrid snapshots when terrain changes

It emits the same session structure used by run_session.py.
"""

import argparse
import json
import os
import subprocess
import tempfile
import time
import importlib.util
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
RESULTS_DIR = os.path.join(SCRIPT_DIR, 'results')
INSTALL_DIR = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir')
NETHACK_BINARY = os.path.join(INSTALL_DIR, 'nethack')

_spec = importlib.util.spec_from_file_location('run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_session = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_session)

tmux_send = _session.tmux_send
tmux_send_special = _session.tmux_send_special
capture_screen_compressed = _session.capture_screen_compressed
screen_to_plain_lines = _session.screen_to_plain_lines
clear_more_prompts = _session.clear_more_prompts
wait_for_game_ready = _session.wait_for_game_ready
read_rng_log = _session.read_rng_log
parse_rng_lines = _session.parse_rng_lines
quit_game = _session.quit_game
compact_session_json = _session.compact_session_json
fixed_datetime_env = _session.fixed_datetime_env
capture_cursor = _session.capture_cursor
collect_mapdump_checkpoints = _session.collect_mapdump_checkpoints


def parse_args():
    p = argparse.ArgumentParser(description='Convert keylog JSONL to standard session JSON')
    p.add_argument('--from-config', action='store_true', help='Regenerate keylog sessions from seeds.json keylog_sessions')
    p.add_argument('--in', dest='input_jsonl', required=False, help='Input keylog JSONL path')
    p.add_argument('--out', dest='output_json', required=False, help='Output session JSON path')
    p.add_argument('--seed', type=int, default=None, help='Override seed (default: from keylog)')
    p.add_argument('--name', default='Recorder')
    p.add_argument('--role', default='Valkyrie')
    p.add_argument('--race', default='human')
    p.add_argument('--gender', default='female')
    p.add_argument('--align', default='neutral')
    p.add_argument('--symset', default='ASCII', choices=['ASCII', 'DECgraphics'])
    p.add_argument(
        '--wizard',
        default='auto',
        choices=['auto', 'on', 'off'],
        help='Launch C in wizard mode: auto=from keylog metadata, on=force -D, off=no -D'
    )
    p.add_argument(
        '--tutorial',
        default='auto',
        choices=['auto', 'on', 'off'],
        help='Tutorial prompt mode for replay rc: auto=from keylog metadata, on=OPTIONS=tutorial, off=OPTIONS=!tutorial'
    )
    p.add_argument(
        '--drop-leading-spaces',
        type=int,
        default=0,
        help='Drop this many leading space key events before replay'
    )
    p.add_argument(
        '--screen-capture',
        default='auto',
        choices=['auto', 'plain', 'ansi', 'both'],
        help='Screen capture mode: plain=text only, ansi=ANSI only, both=both fields, auto=ansi for DECgraphics else plain'
    )
    p.add_argument(
        '--startup-mode',
        default='auto',
        choices=['auto', 'ready', 'from-keylog', 'tutorial-ready'],
        help='Startup handling: ready=auto-advance to map before replay, from-keylog=replay startup keys exactly, tutorial-ready=enter tutorial via OPTIONS then replay keys, auto=detect from keylog in_moveloop'
    )
    p.add_argument(
        '--key-delay-ms',
        type=int,
        default=None,
        help='Replay delay per key in milliseconds (default: 50)'
    )
    args = p.parse_args()
    if not args.from_config and (not args.input_jsonl or not args.output_json):
        p.error('--in and --out are required unless --from-config is used')
    return args


def load_seeds_config():
    config_path = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'seeds.json')
    with open(config_path) as f:
        return json.load(f)


def setup_home(character, symset, tutorial_enabled=False, interactive=False):
    os.makedirs(RESULTS_DIR, exist_ok=True)
    nethackrc = os.path.join(RESULTS_DIR, '.nethackrc')
    with open(nethackrc, 'w') as f:
        if not interactive:
            f.write(f'OPTIONS=name:{character["name"]}\n')
            f.write(f'OPTIONS=race:{character["race"]}\n')
            f.write(f'OPTIONS=role:{character["role"]}\n')
            f.write(f'OPTIONS=gender:{character["gender"]}\n')
            f.write(f'OPTIONS=align:{character["align"]}\n')
            f.write('OPTIONS=!autopickup\n')
            f.write('OPTIONS=tutorial\n' if tutorial_enabled else 'OPTIONS=!tutorial\n')
            f.write('OPTIONS=suppress_alert:3.4.3\n')
        if symset == 'DECgraphics':
            f.write('OPTIONS=symset:DECgraphics\n')
        else:
            f.write('OPTIONS=symset:ASCII\n')

    import glob
    save_dir = os.path.join(INSTALL_DIR, 'save')
    if os.path.isdir(save_dir):
        for fn in glob.glob(os.path.join(save_dir, '*')):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, '*wizard*')):
        if not fn.endswith('.lua'):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, '*Wizard*')):
        if not fn.endswith('.lua'):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, f'*{character["name"]}*')):
        if not fn.endswith('.lua'):
            os.unlink(fn)
    for fn in glob.glob(os.path.join(INSTALL_DIR, 'bon*')):
        os.unlink(fn)


def read_keylog(path):
    """Read keylog JSONL file, returning (metadata, events).

    metadata is a dict from the 'type': 'meta' line if present, else None.
    events is a list of key event dicts sorted by seq.
    """
    events = []
    metadata = None
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get('type') == 'meta':
                metadata = e
            elif isinstance(e.get('key'), int):
                events.append(e)
    events.sort(key=lambda e: int(e.get('seq', 0)))
    if not events:
        raise RuntimeError(f'No key events found in {path}')
    return metadata, events


def key_repr(code):
    if 32 <= code <= 126:
        return chr(code)
    return chr(code)


def describe_key(code):
    if code == 10 or code == 13:
        return 'key-enter'
    if code == 27:
        return 'key-escape'
    if code == 127:
        return 'key-backspace'
    if 1 <= code <= 26:
        return f'key-ctrl-{chr(code + 96)}'
    if 32 <= code <= 126:
        return f'key-{chr(code)}'
    return f'keycode-{code}'


def send_keycode(session_name, code, delay_s):
    if code == 10 or code == 13:
        tmux_send_special(session_name, 'Enter', delay_s)
        return
    if code == 27:
        tmux_send_special(session_name, 'Escape', delay_s)
        return
    if code == 127:
        tmux_send_special(session_name, 'BSpace', delay_s)
        return
    if 1 <= code <= 26:
        tmux_send_special(session_name, f'C-{chr(code + 96)}', delay_s)
        return
    tmux_send(session_name, chr(code), delay_s)


def resolve_screen_capture_mode(screen_capture, symset):
    if screen_capture != 'auto':
        return screen_capture
    # Keep plain `screen` for compatibility while adding ANSI fidelity in DECgraphics mode.
    return 'both' if symset.lower() == 'decgraphics' else 'plain'


def resolve_tutorial_mode(mode, metadata):
    if mode == 'on':
        return True
    if mode == 'off':
        return False
    if metadata and 'tutorial' in metadata:
        return bool(metadata['tutorial'])
    return False


def resolve_wizard_mode(mode, metadata):
    if mode == 'on':
        return True
    if mode == 'off':
        return False
    if metadata and 'wizard' in metadata:
        v = metadata['wizard']
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            return v.strip().lower() in ('1', 'true', 'yes', 'on')
    return True


def parse_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'yes', 'on')
    return default


def drop_leading_space_events(events, drop_count):
    remaining = max(0, int(drop_count or 0))
    if remaining == 0:
        return events, 0
    out = list(events)
    dropped = 0
    while remaining > 0 and out:
        if int(out[0].get('key', -1)) != 32:
            break
        out.pop(0)
        dropped += 1
        remaining -= 1
    return out, dropped


def capture_screen_v3(session_name):
    """Capture canonical v3 screen payload (single ANSI string)."""
    return capture_screen_compressed(session_name)


def detect_screen_depth(screen_lines):
    """Detect depth/branch from rendered status lines only (not keylog metadata)."""
    import re
    level_re = re.compile(
        r'(Tutorial|Dlvl|Mines|Sokoban|Quest|Astral|Fort Ludios|Vlad\'s Tower|Air|Earth|Fire|Water):\s*(\d+)'
    )
    # Status rows are expected near the bottom, but tmux capture can shift rows
    # when there is wrapped output. Scan the bottom window instead of fixed rows.
    tail = screen_lines[max(0, len(screen_lines) - 8):]
    for line in reversed(tail):
        m = level_re.search(line)
        if m:
            return f'{m.group(1)}:{m.group(2)}'
        if 'End Game' in line:
            return 'End Game'
    return 'Dlvl:1'


def looks_like_tutorial_autostart(events, tutorial_enabled):
    """Heuristic: keylog already begins inside tutorial gameplay state."""
    if not tutorial_enabled or not events:
        return False
    window = events[:8]
    return (
        any(int(e.get('in_moveloop', 1)) == 1 and int(e.get('dnum', -1)) == 8 for e in window)
        and int(events[0].get('moves', 0)) >= 1
    )


def run_from_keylog(
    events,
    seed,
    character,
    symset,
    output_json,
    screen_capture_mode,
    startup_mode,
    tutorial_enabled,
    wizard_enabled,
    key_delay_ms,
    regen=None,
    datetime_hint=None,
    interactive=False,
):
    setup_home(character, symset, tutorial_enabled, interactive=interactive)
    output_json = os.path.abspath(output_json)

    tmpdir = tempfile.mkdtemp(prefix='webhack-keylog-session-')
    rng_log_file = os.path.join(tmpdir, 'rnglog.txt')
    mapdump_dir = os.path.join(tmpdir, 'mapdumps')
    os.makedirs(mapdump_dir, exist_ok=True)
    session_name = f'webhack-keylog-{seed}-{os.getpid()}'
    keylog_moves_base = int(events[0].get('moves', 0))

    key_delay_s = max(0.0, float(key_delay_ms) / 1000.0)

    fixed_datetime = datetime_hint or _session.harness_fixed_datetime()
    datetime_env = f'NETHACK_FIXED_DATETIME={fixed_datetime} ' if fixed_datetime else ''

    name_flag = "-u '' " if interactive else f'-u {character["name"]} '
    wiz_flag = '-D' if wizard_enabled else ''
    try:
        cmd = (
            f'NETHACKDIR={INSTALL_DIR} '
            f'{datetime_env}'
            f'NETHACK_SEED={seed} '
            f'NETHACK_RNGLOG={rng_log_file} '
            f'NETHACK_MAPDUMP_DIR={mapdump_dir} '
            f'HOME={RESULTS_DIR} '
            f'TERM=xterm-256color '
            f'{NETHACK_BINARY} {name_flag}{wiz_flag}; '
            f'sleep 999'
        )
        subprocess.run(
            ['tmux', 'new-session', '-d', '-s', session_name, '-x', '80', '-y', '24', cmd],
            check=True
        )
        time.sleep(1.0)

        keylog_has_startup = any(int(e.get('in_moveloop', 1)) == 0 for e in events[:64])
        tutorial_autostart = looks_like_tutorial_autostart(events, tutorial_enabled)
        replay_startup_from_keylog = False
        if startup_mode == 'from-keylog':
            replay_startup_from_keylog = True
        elif startup_mode in ('ready', 'tutorial-ready'):
            replay_startup_from_keylog = False
        elif startup_mode == 'auto':
            # Prefer explicit startup keys whenever present; tutorial_autostart
            # is only a fallback signal for logs that intentionally skipped
            # startup key capture.
            replay_startup_from_keylog = keylog_has_startup

        if replay_startup_from_keylog:
            # Keylog traces captured via c_manual_record already include startup/chargen keys.
            # Do not auto-advance prompts here or we will double-apply startup.
            time.sleep(0.5)
        else:
            wait_for_game_ready(session_name, rng_log_file)
            time.sleep(0.1)
            clear_more_prompts(session_name)
            time.sleep(0.1)

        startup_screen = capture_screen_v3(session_name)
        startup_screen_lines = screen_to_plain_lines(startup_screen)
        startup_cursor = capture_cursor(session_name)
        startup_rng_count, startup_rng_lines = read_rng_log(rng_log_file)
        startup_rng_entries = parse_rng_lines(startup_rng_lines)
        startup_actual_rng = sum(1 for e in startup_rng_entries if e[0] not in ('>', '<'))
        if not replay_startup_from_keylog:
            clear_more_prompts(session_name)

        session_data = {
            'version': 3,
            'seed': seed,
            'source': 'c',
            'type': 'gameplay',
            'options': {
                'name': None if interactive else character['name'],
                'role': None if interactive else character['role'],
                'race': None if interactive else character['race'],
                'gender': None if interactive else character['gender'],
                'align': None if interactive else character['align'],
                'wizard': bool(wizard_enabled),
                'symset': symset,
                'tutorial': None if interactive else bool(tutorial_enabled),
                'datetime': fixed_datetime,
            },
            'steps': [{
                'key': None,
                'rngCalls': startup_actual_rng,
                'rng': startup_rng_entries,
                'screen': startup_screen,
                'cursor': startup_cursor,
            }],
        }
        if regen:
            session_data['regen'] = regen

        prev_rng_count = startup_rng_count
        prev_depth_recorded = None  # Record depth only when it changes
        warned_tutorial_dnum_lag = False

        print(
            f'=== Replaying {len(events)} keylog events '
            f'(seed={seed}, screenCapture={screen_capture_mode}, tutorial={tutorial_enabled}, keyDelayMs={key_delay_ms}) ==='
        )
        for i, e in enumerate(events):
            code = int(e['key'])
            send_keycode(session_name, code, key_delay_s)

            screen = capture_screen_v3(session_name)
            screen_lines = screen_to_plain_lines(screen)
            rng_count, rng_lines = read_rng_log(rng_log_file)
            delta_lines = rng_lines[prev_rng_count:rng_count]
            rng_entries = parse_rng_lines(delta_lines)

            depth = detect_screen_depth(screen_lines)
            turn = max(0, int(e.get('moves', 0)) - keylog_moves_base)

            # Guard against startup-state mismatch: if status says Tutorial while
            # keylog dnum says otherwise, abort instead of producing a bad fixture.
            if screen_lines:
                status_line = screen_lines[23] if len(screen_lines) > 23 else ''
                ev_dnum = e.get('dnum')
                if isinstance(ev_dnum, int) and 'Tutorial:' in status_line and ev_dnum != 8:
                    seq = int(e.get('seq', 0) or 0)
                    if seq <= 32 and not replay_startup_from_keylog and not tutorial_autostart:
                        raise RuntimeError(
                            f'Keylog/session mismatch at seq={e.get("seq")}: '
                            f'status shows Tutorial but keylog dnum={ev_dnum}'
                        )
                    if not warned_tutorial_dnum_lag:
                        print(
                            f'  [warn] tutorial status lag at seq={seq}: '
                            f'keylog dnum={ev_dnum}; continuing'
                        )
                        warned_tutorial_dnum_lag = True

            step = {
                'key': key_repr(code),
                'turn': turn,
                'rng': rng_entries,
                'screen': screen,
                'cursor': capture_cursor(session_name),
            }
            if depth != prev_depth_recorded:
                step['depth'] = depth
                prev_depth_recorded = depth

            session_data['steps'].append(step)
            prev_rng_count = rng_count
            if (i + 1) % 200 == 0:
                print(f'  replayed {i + 1}/{len(events)} events')

        quit_game(session_name)

        # Collect auto-mapdump checkpoints from NETHACK_MAPDUMP_DIR
        all_rng = []
        for step in session_data.get('steps', []):
            all_rng.extend(step.get('rng', []))
        checkpoints = collect_mapdump_checkpoints(mapdump_dir, all_rng)
        if checkpoints:
            session_data['checkpoints'] = checkpoints
            print(f'  Collected {len(checkpoints)} map checkpoint(s): {", ".join(sorted(checkpoints.keys()))}')

        os.makedirs(os.path.dirname(output_json), exist_ok=True)
        with open(output_json, 'w') as f:
            f.write(compact_session_json(session_data))
        print(f'Wrote {output_json}')

    finally:
        subprocess.run(['tmux', 'kill-session', '-t', session_name], capture_output=True)
        shutil.rmtree(tmpdir, ignore_errors=True)


def entry_value(entry, metadata, key, default=None):
    if key in entry and entry.get(key) is not None:
        return entry.get(key)
    if metadata and key in metadata and metadata.get(key) is not None:
        return metadata.get(key)
    return default


def resolve_character_from_entry(entry, metadata):
    character = {
        'name': entry_value(entry, metadata, 'name', 'Recorder'),
        'role': entry_value(entry, metadata, 'role', 'Valkyrie'),
        'race': entry_value(entry, metadata, 'race', 'human'),
        'gender': entry_value(entry, metadata, 'gender', 'female'),
        'align': entry_value(entry, metadata, 'align', 'neutral'),
    }
    char_spec = entry.get('character')
    if isinstance(char_spec, str):
        preset = _session.CHARACTER_PRESETS.get(char_spec.lower())
        if preset:
            character.update(preset)
    elif isinstance(char_spec, dict):
        character.update(char_spec)
    for key in ('name', 'role', 'race', 'gender', 'align'):
        if entry.get(key) is not None:
            character[key] = entry[key]
    return character


def tutorial_mode_from_entry(entry):
    raw = entry.get('tutorial', 'auto')
    if isinstance(raw, bool):
        return 'on' if raw else 'off'
    raw = str(raw).strip().lower()
    if raw in ('auto', 'on', 'off'):
        return raw
    return 'auto'


def run_from_config():
    config = load_seeds_config()
    entries = config.get('keylog_sessions', {}).get('sessions', [])
    if not entries:
        print('No keylog_sessions.sessions entries found in seeds.json')
        return

    sessions_dir = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')
    for entry in entries:
        keylog_rel = entry.get('keylog')
        if not keylog_rel:
            print(f'Skipping invalid keylog entry (missing keylog): {entry}')
            continue
        input_jsonl = keylog_rel if os.path.isabs(keylog_rel) else os.path.join(PROJECT_ROOT, keylog_rel)
        metadata, events = read_keylog(input_jsonl)

        seed = int(entry_value(entry, metadata, 'seed', 1))
        label = str(entry.get('label', '')).strip()
        output_rel = entry.get('output')
        if output_rel:
            output_json = output_rel if os.path.isabs(output_rel) else os.path.join(PROJECT_ROOT, output_rel)
        else:
            suffix = f'_{label}' if label else ''
            output_json = os.path.join(sessions_dir, f'seed{seed}{suffix}_gameplay.session.json')

        character = resolve_character_from_entry(entry, metadata)
        symset = str(entry_value(entry, metadata, 'symset', 'ASCII'))
        screen_capture_mode = resolve_screen_capture_mode(str(entry.get('screenCapture', 'auto')), symset)
        startup_mode = str(entry.get('startupMode', 'auto'))
        tutorial_enabled = resolve_tutorial_mode(tutorial_mode_from_entry(entry), metadata)
        wizard_enabled = parse_bool(entry_value(entry, metadata, 'wizard', True), default=True)
        key_delay_ms = int(entry.get('keyDelayMs', 50))
        replay_events, dropped = drop_leading_space_events(events, int(entry.get('dropLeadingSpaces', 0) or 0))

        if metadata:
            print(
                f'[{label or os.path.basename(output_json)}] '
                f'metadata seed={metadata.get("seed")} role={metadata.get("role")} '
                f'tutorial={bool(metadata.get("tutorial", False))}'
            )
        if dropped:
            print(f'[{label or os.path.basename(output_json)}] dropped leading spaces: {dropped}')

        regen = {
            'mode': 'manual-direct-live' if interactive else 'keylog',
            'subtype': 'manual',
            'keylog': keylog_rel,
            'datetime': str(metadata.get('datetime') or _session.harness_fixed_datetime()) if metadata else _session.harness_fixed_datetime(),
            'startupMode': startup_mode,
            'screenCapture': screen_capture_mode,
            'tutorial': tutorial_enabled,
            'wizard': wizard_enabled,
            'dropLeadingSpaces': dropped,
            'keyDelayMs': key_delay_ms,
        }
        run_from_keylog(
            replay_events,
            seed,
            character,
            symset,
            output_json,
            screen_capture_mode,
            startup_mode,
            tutorial_enabled,
            wizard_enabled,
            key_delay_ms,
            regen=regen,
            datetime_hint=str(metadata.get('datetime')) if (metadata and metadata.get('datetime')) else None,
        )


def main():
    args = parse_args()
    if args.from_config:
        run_from_config()
        return
    metadata, events = read_keylog(args.input_jsonl)

    # Use metadata from keylog header if available, with command line overrides
    def get_opt(name, default):
        """Get option: CLI arg > metadata > default."""
        cli_val = getattr(args, name, None)
        # Check if CLI provided a non-default value
        cli_default = {'name': 'Recorder', 'role': 'Valkyrie', 'race': 'human',
                       'gender': 'female', 'align': 'neutral', 'symset': 'ASCII'}.get(name)
        if cli_val is not None and cli_val != cli_default:
            return cli_val
        if metadata and name in metadata:
            return metadata[name]
        return cli_val if cli_val is not None else default

    seed = args.seed
    if seed is None:
        if metadata and 'seed' in metadata:
            seed = int(metadata['seed'])
        else:
            raw_seed = events[0].get('seed')
            seed = int(raw_seed) if raw_seed is not None else 1

    character = {
        'name': get_opt('name', 'Recorder'),
        'role': get_opt('role', 'Valkyrie'),
        'race': get_opt('race', 'human'),
        'gender': get_opt('gender', 'female'),
        'align': get_opt('align', 'neutral'),
    }

    symset = get_opt('symset', 'ASCII')

    if metadata:
        print(
            f'Using keylog metadata: seed={seed}, role={character["role"]}, '
            f'name={character["name"]}, tutorial={bool(metadata.get("tutorial", False))}'
        )

    screen_capture_mode = resolve_screen_capture_mode(args.screen_capture, symset)
    tutorial_enabled = resolve_tutorial_mode(args.tutorial, metadata)
    wizard_enabled = resolve_wizard_mode(args.wizard, metadata)
    key_delay_ms = int(args.key_delay_ms if args.key_delay_ms is not None else 50)
    replay_events, dropped = drop_leading_space_events(events, args.drop_leading_spaces)
    if dropped:
        print(f'Dropped leading space key events: {dropped}')
    interactive = bool(metadata.get('interactive', False)) if metadata else False
    regen = {
        'mode': 'manual-direct-live' if interactive else 'keylog',
        'subtype': 'manual',
        'keylog': os.path.relpath(os.path.abspath(args.input_jsonl), PROJECT_ROOT),
        'datetime': str(metadata.get('datetime') or _session.harness_fixed_datetime()) if metadata else _session.harness_fixed_datetime(),
        'startupMode': args.startup_mode,
        'screenCapture': screen_capture_mode,
        'tutorial': tutorial_enabled,
        'wizard': wizard_enabled,
        'dropLeadingSpaces': dropped,
        'keyDelayMs': key_delay_ms,
        'interactive': interactive,
    }
    run_from_keylog(
        replay_events,
        seed,
        character,
        symset,
        args.output_json,
        screen_capture_mode,
        args.startup_mode,
        tutorial_enabled,
        wizard_enabled,
        key_delay_ms,
        regen=regen,
        datetime_hint=str(metadata.get('datetime')) if (metadata and metadata.get('datetime')) else None,
        interactive=interactive,
    )


if __name__ == '__main__':
    main()
