#!/usr/bin/env python3
"""Record a manual C NetHack run directly into a v3 session JSON.

This launcher starts:
1) a seeded tmux C game session with NETHACK_KEYLOG + NETHACK_RNGLOG
2) a background watcher that captures per-key ANSI screens and RNG deltas

The watcher writes a v3 session file continuously while the manual game runs.
"""

import argparse
import glob
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
INSTALL_DIR = os.path.join(PROJECT_ROOT, "nethack-c", "install", "games", "lib", "nethackdir")
NETHACK_BINARY = os.path.join(INSTALL_DIR, "nethack")
RUN_SESSION_PATH = os.path.join(SCRIPT_DIR, "run_session.py")


def load_run_session_module():
    spec = importlib.util.spec_from_file_location("run_session", RUN_SESSION_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def key_repr(code):
    try:
        return chr(int(code))
    except Exception:
        return ""


def tmux_has_session(session_name):
    proc = subprocess.run(["tmux", "has-session", "-t", session_name], capture_output=True)
    return proc.returncode == 0


def read_key_codes(path):
    keys = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if isinstance(obj.get("key"), int):
                keys.append(int(obj["key"]))
    return keys


def tmux_send_hex_key(session_name, code):
    subprocess.run(
        ["tmux", "send-keys", "-t", session_name, "-H", format(int(code) & 0xFF, "x")],
        check=True,
    )


def clean_game_state(player_name):
    save_dir = os.path.join(INSTALL_DIR, "save")
    if os.path.isdir(save_dir):
        for fn in glob.glob(os.path.join(save_dir, "*")):
            try:
                os.unlink(fn)
            except FileNotFoundError:
                pass

    lower_name = str(player_name or "").lower()
    for fn in os.listdir(INSTALL_DIR):
        if fn.endswith(".lua"):
            continue
        lower = fn.lower()
        if (
            lower.startswith("bon")
            or "wizard" in lower
            or "agent" in lower
            or (lower_name and lower_name in lower)
        ):
            path = os.path.join(INSTALL_DIR, fn)
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


def write_nethackrc(home_dir, opts):
    os.makedirs(home_dir, exist_ok=True)
    rc_path = os.path.join(home_dir, ".nethackrc")
    with open(rc_path, "w", encoding="utf-8") as f:
        f.write(f"OPTIONS=name:{opts.name}\n")
        f.write(f"OPTIONS=role:{opts.role}\n")
        f.write(f"OPTIONS=race:{opts.race}\n")
        f.write(f"OPTIONS=gender:{opts.gender}\n")
        f.write(f"OPTIONS=align:{opts.align}\n")
        f.write(f"OPTIONS=symset:{opts.symset}\n")
        if opts.tutorial_option == "on":
            f.write("OPTIONS=tutorial\n")
        elif opts.tutorial_option == "off":
            f.write("OPTIONS=!tutorial\n")


def write_keylog_header(path, opts):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    iso_utc = datetime.now(timezone.utc).isoformat()
    header = {
        "type": "meta",
        "seed": opts.seed,
        "role": opts.role,
        "race": opts.race,
        "gender": opts.gender,
        "align": opts.align,
        "name": opts.name,
        "wizard": bool(opts.wizard),
        "tutorial": None if opts.tutorial_option == "unset" else (opts.tutorial_option == "on"),
        "symset": opts.symset,
        "datetime": opts.datetime if opts.datetime else None,
        "keylogDelayMs": int(opts.keylog_delay_ms),
        "recordedAt": iso_utc,
        "captureMode": "direct-v3-live",
    }
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(header) + "\n")


def run_watcher(args):
    session_mod = load_run_session_module()

    capture_screen_compressed = session_mod.capture_screen_compressed
    capture_screen_lines = session_mod.capture_screen_lines
    read_rng_log = session_mod.read_rng_log
    parse_rng_lines = session_mod.parse_rng_lines
    detect_depth = session_mod.detect_depth
    compact_session_json = session_mod.compact_session_json

    keylog = args.keylog
    rnglog = args.rnglog
    out_json = args.output_session
    session_name = args.session

    session_data = {
        "version": 3,
        "seed": args.seed,
        "source": "c",
        "type": "gameplay",
        "options": {
            "name": args.name,
            "role": args.role,
            "race": args.race,
            "gender": args.gender,
            "align": args.align,
            "wizard": bool(args.wizard),
            "symset": args.symset,
            "tutorial": None if args.tutorial_option == "unset" else (args.tutorial_option == "on"),
        },
        "regen": {
            "mode": "manual-direct-live",
            "session": session_name,
            "keylog": os.path.relpath(keylog, PROJECT_ROOT),
            "rnglog": rnglog,
        },
        "steps": [],
    }

    print(f"[watcher] start session={session_name} keylog={keylog} rnglog={rnglog}", flush=True)

    # Wait until game session is alive and keylog exists.
    for _ in range(300):
        if tmux_has_session(session_name) and os.path.exists(keylog):
            break
        time.sleep(0.05)

    startup_rng_count = 0
    try:
        startup_screen = capture_screen_compressed(session_name)
        startup_rng_count, startup_rng_lines = read_rng_log(rnglog)
        session_data["steps"].append(
            {
                "key": None,
                "rng": parse_rng_lines(startup_rng_lines),
                "screen": startup_screen,
            }
        )
    except Exception:
        # If startup capture fails, keep going; per-key captures may still succeed.
        pass

    seen = set()
    keylog_moves_base = None
    rng_count = startup_rng_count
    last_flush = 0.0

    while tmux_has_session(session_name):
        new_events = []
        try:
            with open(keylog, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except Exception:
                        continue
                    if isinstance(obj.get("seq"), int) and isinstance(obj.get("key"), int):
                        if obj["seq"] not in seen:
                            new_events.append(obj)
        except FileNotFoundError:
            pass

        new_events.sort(key=lambda e: int(e["seq"]))
        for e in new_events:
            if keylog_moves_base is None:
                keylog_moves_base = int(e.get("moves", 0))
            time.sleep(0.03)
            try:
                screen = capture_screen_compressed(session_name)
                lines = capture_screen_lines(session_name)
                cur_rng_count, cur_rng_lines = read_rng_log(rnglog)
                delta = parse_rng_lines(cur_rng_lines[rng_count:cur_rng_count])
                rng_count = cur_rng_count
                turn = max(0, int(e.get("moves", 0)) - int(keylog_moves_base or 0))
                session_data["steps"].append(
                    {
                        "key": key_repr(e["key"]),
                        "turn": turn,
                        "depth": detect_depth(lines),
                        "rng": delta,
                        "screen": screen,
                    }
                )
                seen.add(e["seq"])
            except Exception as ex:
                # Do not mark seen on failure; retry capture for this key.
                print(f"[watcher] capture error seq={e.get('seq')} key={e.get('key')}: {ex}", flush=True)

        now = time.time()
        if now - last_flush > 1.0:
            with open(out_json, "w", encoding="utf-8") as f:
                f.write(compact_session_json(session_data))
            last_flush = now
        time.sleep(0.05)

    # Final flush
    with open(out_json, "w", encoding="utf-8") as f:
        f.write(compact_session_json(session_data))


def build_watch_cmd(args):
    watch_cmd = [
        sys.executable,
        __file__,
        "--watch",
        "--session",
        args.session,
        "--seed",
        str(args.seed),
        "--name",
        args.name,
        "--role",
        args.role,
        "--race",
        args.race,
        "--gender",
        args.gender,
        "--align",
        args.align,
        "--symset",
        args.symset,
        "--tutorial-option",
        args.tutorial_option,
        "--keylog",
        args.keylog,
        "--rnglog",
        args.rnglog,
        "--output-session",
        args.output_session,
    ]
    if args.wizard:
        watch_cmd.append("--wizard")
    return watch_cmd


def launch_manual_capture(args):
    clean_game_state(args.name)
    write_nethackrc(args.home, args)
    write_keylog_header(args.keylog, args)

    # Fresh logs/output
    os.makedirs(os.path.dirname(args.output_session), exist_ok=True)
    os.makedirs(os.path.dirname(args.watch_log), exist_ok=True)
    for path in (args.rnglog, args.output_session, args.watch_log):
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    if tmux_has_session(args.session):
        subprocess.run(["tmux", "kill-session", "-t", args.session], check=True)

    wizard_flag = "-D" if args.wizard else ""
    datetime_env = f"NETHACK_FIXED_DATETIME={args.datetime} " if args.datetime else ""
    cmd = (
        f"NETHACKDIR={INSTALL_DIR} "
        f"NETHACK_SEED={args.seed} "
        f"{datetime_env}"
        f"NETHACK_KEYLOG={args.keylog} "
        f"NETHACK_KEYLOG_DELAY_MS={args.keylog_delay_ms} "
        f"NETHACK_RNGLOG={args.rnglog} "
        f"HOME={args.home} "
        f"TERM=xterm-256color "
        f"{NETHACK_BINARY} -u {args.name} {wizard_flag}; "
        f"sleep 999"
    )

    subprocess.run(
        ["tmux", "new-session", "-d", "-s", args.session, "-x", "80", "-y", "24", cmd],
        check=True,
    )
    subprocess.run(["tmux", "set-window-option", "-t", args.session, "window-size", "manual"], check=True)
    subprocess.run(["tmux", "resize-window", "-t", args.session, "-x", "80", "-y", "24"], check=True)

    watch_cmd = build_watch_cmd(args)

    with open(args.watch_log, "w", encoding="utf-8") as log_f:
        watch_proc = subprocess.Popen(watch_cmd, stdout=log_f, stderr=log_f)

    print(f"SESSION={args.session}")
    print(f"KEYLOG={args.keylog}")
    print(f"RNGLOG={args.rnglog}")
    print(f"OUT_SESSION={args.output_session}")
    print(f"WATCH_LOG={args.watch_log}")
    print(f"WATCHER_PID={watch_proc.pid}")
    print(f"ATTACH=tmux attach -d -t {args.session}")


def run_autofeed_capture(args):
    if not args.autofeed_keylog:
        raise SystemExit("--autofeed requires --autofeed-keylog")
    source_keylog = os.path.abspath(args.autofeed_keylog)
    if not os.path.exists(source_keylog):
        raise SystemExit(f"autofeed keylog not found: {source_keylog}")

    clean_game_state(args.name)
    write_nethackrc(args.home, args)
    write_keylog_header(args.keylog, args)
    os.makedirs(os.path.dirname(args.output_session), exist_ok=True)
    os.makedirs(os.path.dirname(args.watch_log), exist_ok=True)
    for path in (args.rnglog, args.output_session, args.watch_log):
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    if tmux_has_session(args.session):
        subprocess.run(["tmux", "kill-session", "-t", args.session], check=True)

    wizard_flag = "-D" if args.wizard else ""
    datetime_env = f"NETHACK_FIXED_DATETIME={args.datetime} " if args.datetime else ""
    cmd = (
        f"NETHACKDIR={INSTALL_DIR} "
        f"NETHACK_SEED={args.seed} "
        f"{datetime_env}"
        f"NETHACK_KEYLOG={args.keylog} "
        f"NETHACK_KEYLOG_DELAY_MS={args.keylog_delay_ms} "
        f"NETHACK_RNGLOG={args.rnglog} "
        f"HOME={args.home} "
        f"TERM=xterm-256color "
        f"{NETHACK_BINARY} -u {args.name} {wizard_flag}; "
        f"sleep 999"
    )
    subprocess.run(
        ["tmux", "new-session", "-d", "-s", args.session, "-x", "80", "-y", "24", cmd],
        check=True,
    )
    subprocess.run(["tmux", "set-window-option", "-t", args.session, "window-size", "manual"], check=True)
    subprocess.run(["tmux", "resize-window", "-t", args.session, "-x", "80", "-y", "24"], check=True)

    source_keys = read_key_codes(source_keylog)
    delay_s = max(0, int(args.autofeed_delay_ms)) / 1000.0
    watch_cmd = build_watch_cmd(args)
    with open(args.watch_log, "w", encoding="utf-8") as log_f:
        watch_proc = subprocess.Popen(watch_cmd, stdout=log_f, stderr=log_f)
        for i, code in enumerate(source_keys, start=1):
            tmux_send_hex_key(args.session, code)
            if i % 200 == 0:
                print(f"AUTOFEED={i}/{len(source_keys)}", flush=True)
            if delay_s > 0:
                time.sleep(delay_s)
        print(f"AUTOFEED_DONE={len(source_keys)}")
        time.sleep(0.5)
        if tmux_has_session(args.session):
            subprocess.run(["tmux", "kill-session", "-t", args.session], check=True)
        deadline = time.time() + (max(1, int(args.autofeed_finalize_ms)) / 1000.0)
        while time.time() < deadline:
            if watch_proc.poll() is not None:
                break
            time.sleep(0.1)
        if watch_proc.poll() is None:
            watch_proc.terminate()
            watch_proc.wait(timeout=2)

    captured_keys = read_key_codes(args.keylog) if os.path.exists(args.keylog) else []
    mismatch = None
    for idx, (a, b) in enumerate(zip(source_keys, captured_keys), start=1):
        if a != b:
            mismatch = (idx, a, b)
            break
    print(f"SESSION={args.session}")
    print(f"KEYLOG={args.keylog}")
    print(f"RNGLOG={args.rnglog}")
    print(f"OUT_SESSION={args.output_session}")
    print(f"WATCH_LOG={args.watch_log}")
    print(f"AUTOFEED_SOURCE_KEYS={len(source_keys)}")
    print(f"AUTOFEED_CAPTURED_KEYS={len(captured_keys)}")
    if mismatch is None:
        print("AUTOFEED_KEY_MISMATCH_AT=none")
    else:
        print(f"AUTOFEED_KEY_MISMATCH_AT={mismatch[0]} src={mismatch[1]} cap={mismatch[2]}")
    if os.path.exists(args.output_session):
        try:
            with open(args.output_session, "r", encoding="utf-8") as f:
                session = json.load(f)
            print(f"AUTOFEED_SESSION_STEPS={len(session.get('steps', []))}")
        except Exception as ex:
            print(f"AUTOFEED_SESSION_PARSE_ERROR={ex}")


def default_paths(seed, name):
    keylog = os.path.join(PROJECT_ROOT, "test", "comparison", "keylogs", f"seed{seed}_{name.lower()}_manual_direct.jsonl")
    out = os.path.join(PROJECT_ROOT, "test", "comparison", "sessions", f"seed{seed}_{name.lower()}_manual_direct.session.json")
    home = os.path.join(PROJECT_ROOT, "test", "comparison", "c-harness", "results", f"manual_seed{seed}_{name.lower()}_direct")
    watch_log = os.path.join("/tmp", f"manual_direct_seed{seed}_{name.lower()}.watch.log")
    rnglog = os.path.join("/tmp", f"manual_direct_seed{seed}_{name.lower()}.rnglog")
    session = f"nethack-manual-seed{seed}-direct-{name.lower()}"
    return keylog, out, home, watch_log, rnglog, session


def parse_args():
    p = argparse.ArgumentParser(description="Manual C -> direct v3 session recorder")
    p.add_argument("--watch", action="store_true", help=argparse.SUPPRESS)
    p.add_argument("--seed", type=int, default=8)
    p.add_argument("--name", default="Tutes")
    p.add_argument("--role", default="Wizard")
    p.add_argument("--race", default="human")
    p.add_argument("--gender", default="male")
    p.add_argument("--align", default="neutral")
    p.add_argument("--symset", default="DECgraphics", choices=["ASCII", "DECgraphics"])
    p.add_argument("--tutorial-option", default="unset", choices=["unset", "on", "off"])
    p.add_argument("--wizard", action="store_true", help="Launch with -D")
    p.add_argument("--datetime", default="20000110090000")
    p.add_argument("--keylog-delay-ms", type=int, default=0)
    p.add_argument("--session", default=None)
    p.add_argument("--keylog", default=None)
    p.add_argument("--rnglog", default=None)
    p.add_argument("--output-session", default=None)
    p.add_argument("--home", default=None)
    p.add_argument("--watch-log", default=None)
    p.add_argument("--autofeed", action="store_true",
                   help="Run launch+watch+exact key feed+finalize in one process")
    p.add_argument("--autofeed-keylog", default=None,
                   help="Source keylog JSONL to feed during --autofeed")
    p.add_argument("--autofeed-delay-ms", type=int, default=120,
                   help="Inter-key delay in ms for --autofeed")
    p.add_argument("--autofeed-finalize-ms", type=int, default=10000,
                   help="Watcher flush wait in ms after killing tmux session")
    args = p.parse_args()

    d_keylog, d_out, d_home, d_watch_log, d_rnglog, d_session = default_paths(args.seed, args.name)
    if args.keylog is None:
        args.keylog = d_keylog
    if args.output_session is None:
        args.output_session = d_out
    if args.home is None:
        args.home = d_home
    if args.watch_log is None:
        args.watch_log = d_watch_log
    if args.rnglog is None:
        args.rnglog = d_rnglog
    if args.session is None:
        args.session = d_session

    args.keylog = os.path.abspath(args.keylog)
    args.output_session = os.path.abspath(args.output_session)
    args.home = os.path.abspath(args.home)
    return args


def main():
    args = parse_args()
    if args.watch:
        run_watcher(args)
    elif args.autofeed:
        run_autofeed_capture(args)
    else:
        launch_manual_capture(args)


if __name__ == "__main__":
    main()
