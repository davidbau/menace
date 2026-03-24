#!/usr/bin/env python3
"""
run_session.py — CLI runner for the Rogue 3.6 harness.

Usage (single game):
    python3 run_session.py --seed N --keys "hjkl..." --out output.json

Usage (multigame — records save/restore across multiple games):
    python3 run_session.py --multigame input.json --out output.json

Runs rogue_harness with the given seed and keystroke sequence,
producing a JSON session file.
"""

import subprocess
import os
import sys
import argparse
import json
import tempfile


def run_harness(harness, seed, keys, outfile, wizard=False, restore_file=None, timeout=30.0):
    """Run the harness binary once and return the JSON output."""
    env = os.environ.copy()
    env["HARNESS_SEED"] = str(seed)
    env["HARNESS_KEYS"] = keys
    env["HARNESS_OUT"] = outfile
    if restore_file:
        env["HARNESS_RESTORE"] = restore_file

    cmd = [harness]
    if wizard:
        cmd.append("--wizard")

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"ERROR: harness timed out after {timeout}s", file=sys.stderr)
        return None

    if not os.path.exists(outfile):
        print("ERROR: harness did not produce output file", file=sys.stderr)
        if result.stderr:
            print(result.stderr.decode(errors="replace"), file=sys.stderr)
        return None

    try:
        with open(outfile) as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: output is not valid JSON: {e}", file=sys.stderr)
        return None


def run_single(args, harness):
    """Run a single-game session."""
    data = run_harness(harness, args.seed, args.keys, args.out,
                       wizard=args.wizard, timeout=args.timeout)
    if data is None:
        sys.exit(1)

    n_steps = len(data.get("steps", []))
    seed_out = data.get("seed", "?")
    print(f"OK: seed={seed_out} steps={n_steps}")


def run_multigame(args, harness):
    """Run a multigame session: multiple games sharing save state."""
    with open(args.multigame) as f:
        session = json.load(f)

    games = session.get("games", [])
    if not games:
        print("ERROR: no games in multigame session", file=sys.stderr)
        sys.exit(1)

    # Save file location — game writes to $HOME/rogue.save
    save_file = "/tmp/rogue.save"
    # Clean up any stale save
    if os.path.exists(save_file):
        os.remove(save_file)

    all_game_data = []
    seed = session.get("seed", games[0].get("seed", 42))
    wizard = session.get("wizard", False)

    for gi, game in enumerate(games):
        game_seed = game.get("seed", seed)
        game_wizard = game.get("wizard", wizard)
        game_keys = "".join(s.get("key", "") for s in game.get("steps", []))
        is_restore = gi > 0 or game.get("restore", False)

        # Temp output for this game
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            game_outfile = tf.name

        try:
            data = run_harness(
                harness, game_seed, game_keys, game_outfile,
                wizard=game_wizard,
                restore_file=save_file if is_restore else None,
                timeout=args.timeout,
            )
            if data is None:
                print(f"ERROR: game {gi} failed", file=sys.stderr)
                sys.exit(1)

            all_game_data.append(data)
            n_steps = len(data.get("steps", []))
            print(f"Game {gi}: seed={game_seed} steps={n_steps}"
                  f"{' (restored)' if is_restore else ''}")
        finally:
            if os.path.exists(game_outfile):
                os.remove(game_outfile)

    # Build combined output
    output = {
        "seed": seed,
        "wizard": wizard,
        "games": [],
    }
    for gi, (game, data) in enumerate(zip(games, all_game_data)):
        entry = {
            "seed": game.get("seed", seed),
            "wizard": game.get("wizard", wizard),
            "steps": data.get("steps", []),
        }
        if gi > 0 or game.get("restore", False):
            entry["restore"] = True
        output["games"].append(entry)

    with open(args.out, "w") as f:
        json.dump(output, f)

    total = sum(len(g.get("steps", [])) for g in output["games"])
    print(f"OK: {len(games)} games, {total} total steps → {args.out}")


def main():
    p = argparse.ArgumentParser(
        description="Run Rogue 3.6 harness and produce a JSON session file"
    )
    p.add_argument("--seed", type=int, help="RNG seed")
    p.add_argument("--keys", type=str, help="Keystroke sequence")
    p.add_argument("--out", type=str, required=True, help="Output JSON file path")
    p.add_argument("--timeout", type=float, default=30.0, help="Timeout in seconds")
    p.add_argument("--wizard", action="store_true", help="Enable wizard mode")
    p.add_argument("--multigame", type=str, help="Multigame session JSON input file")
    args = p.parse_args()

    harness = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rogue_harness")
    if not os.path.exists(harness):
        print(f"ERROR: harness binary not found at {harness}", file=sys.stderr)
        print("Run 'make' in the patched directory first.", file=sys.stderr)
        sys.exit(1)

    if args.multigame:
        run_multigame(args, harness)
    else:
        if args.seed is None or args.keys is None:
            p.error("--seed and --keys are required for single-game mode")
        run_single(args, harness)


if __name__ == "__main__":
    main()
