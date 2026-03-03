#!/usr/bin/env python3
"""Regenerate legacy grouped special-map files in test/comparison/maps.

This script rebuilds files like:
  test/comparison/maps/seed1_special_sokoban.session.json

using the current C harness (`run_session.py --wizload`) so that map
checkpoints are refreshed while preserving the legacy grouped schema:
  {version, seed, type="special", source="c", group, screenMode, levels[]}
"""

import argparse
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
MAPS_DIR = PROJECT_ROOT / "test" / "comparison" / "maps"
RUN_SESSION = SCRIPT_DIR / "run_session.py"
PLANES_GEN = SCRIPT_DIR / "gen_planes_with_amulet.py"

# Reuse canonical level metadata.
import importlib.util

_special_spec = importlib.util.spec_from_file_location(
    "gen_special_sessions", SCRIPT_DIR / "gen_special_sessions.py"
)
_special = importlib.util.module_from_spec(_special_spec)
_special_spec.loader.exec_module(_special)
LEVEL_GROUPS = _special.LEVEL_GROUPS
QUEST_ROLE_BY_PREFIX = _special.QUEST_ROLE_BY_PREFIX


SPECIAL_FILE_RE = re.compile(r"^seed(?P<seed>\d+)_special_(?P<group>[a-z]+)\.session\.json$")
RNG_RE = re.compile(r"^(?P<fn>rn2|rnd|rn1|d)\((?P<arg>\d+)\)=(?P<result>-?\d+)")


def char_to_typ(ch):
    if ch == "?":
        # run_session.py uses '?' as a sentinel for out-of-range typ values.
        # Legacy grouped traces are typGrid-focused; coerce unknown cells to 0.
        return 0
    if "0" <= ch <= "9":
        return ord(ch) - ord("0")
    if "a" <= ch <= "z":
        return 10 + ord(ch) - ord("a")
    if "A" <= ch <= "Z":
        return 36 + ord(ch) - ord("A")
    raise ValueError(f"bad typ char: {ch!r}")


def decode_typgrid_row_rle(row_str, row_width=80):
    row = []
    if row_str:
        for part in row_str.split(","):
            if not part:
                continue
            if ":" in part:
                c_str, t_str = part.split(":", 1)
                count = int(c_str)
                typ = char_to_typ(t_str)
            else:
                count = 1
                typ = char_to_typ(part)
            row.extend([typ] * count)
    if len(row) < row_width:
        row.extend([0] * (row_width - len(row)))
    return row[:row_width]


def decode_typgrid_rle(grid_str):
    if not isinstance(grid_str, str):
        return grid_str
    rows = grid_str.split("|")
    while len(rows) < 21:
        rows.append("")
    return [decode_typgrid_row_rle(r) for r in rows[:21]]


def parse_rng_fingerprint(rng_entries, limit=20):
    fp = []
    for entry in rng_entries:
        if not isinstance(entry, str):
            continue
        m = RNG_RE.match(entry)
        if not m:
            continue
        fp.append(
            {
                "fn": m.group("fn"),
                "result": int(m.group("result")),
                "arg": int(m.group("arg")),
            }
        )
        if len(fp) >= limit:
            break
    pre = [{"fn": x["fn"], "arg": x["arg"]} for x in fp[:2]]
    return pre, fp


def run_wizload(seed, level_name, role_name=None):
    with tempfile.TemporaryDirectory(prefix=f"legacy-special-{seed}-{level_name}-") as td:
        out = Path(td) / "wizload.session.json"
        cmd = ["python3", str(RUN_SESSION), str(seed), str(out), "--wizload", level_name]
        if role_name:
            cmd += ["--character", role_name.lower()]
        subprocess.run(cmd, check=True, cwd=str(SCRIPT_DIR))
        with out.open() as f:
            return json.load(f)


def extract_level_data(wizload_session, level_def, role_name=None):
    steps = wizload_session.get("steps", [])
    level_step = None
    for st in reversed(steps):
        if "typGrid" in st:
            level_step = st
            break
    if level_step is None:
        raise RuntimeError("wizload output missing typGrid step")

    level_data = {
        "levelName": level_def["name"],
        "branch": level_def["branch"],
        "typGrid": decode_typgrid_rle(level_step.get("typGrid")),
    }
    if "branchLevel" in level_def:
        level_data["branchLevel"] = level_def["branchLevel"]
    if "nlevels" in level_def:
        level_data["nlevels"] = level_def["nlevels"]
    if role_name:
        level_data["role"] = role_name

    checkpoints = level_step.get("checkpoints") or []
    decoded_checkpoints = []
    for cp in checkpoints:
        out_cp = dict(cp)
        for grid_key in ("typGrid", "flagGrid", "wallInfoGrid"):
            if grid_key in out_cp and isinstance(out_cp[grid_key], str):
                out_cp[grid_key] = decode_typgrid_rle(out_cp[grid_key])
        decoded_checkpoints.append(out_cp)
    if decoded_checkpoints:
        level_data["checkpoints"] = decoded_checkpoints
        first_cp = decoded_checkpoints[0]
        level_data["absDepth"] = int(first_cp.get("dlevel", 0) or 0)
        level_data["rngCallStart"] = int(first_cp.get("rngCallCount", 0) or 0)
        level_data["rngRawCallStart"] = int(first_cp.get("rngCallCount", 0) or 0)
    else:
        level_data["absDepth"] = 0
        level_data["rngCallStart"] = 0
        level_data["rngRawCallStart"] = 0

    pre, fp = parse_rng_fingerprint(level_step.get("rng") or [])
    if pre:
        level_data["preRngCalls"] = pre
    if fp:
        level_data["rngFingerprint"] = fp

    return level_data


def regenerate_special_group(seed, group):
    if group == "planes":
        # Dedicated generator handles endgame setup and writes legacy grouped files.
        cmd = ["python3", str(PLANES_GEN), "--seeds", str(seed)]
        subprocess.run(cmd, check=True, cwd=str(SCRIPT_DIR))
        return

    if group not in LEVEL_GROUPS:
        raise RuntimeError(f"unknown special group: {group}")

    group_def = LEVEL_GROUPS[group]
    levels_out = []
    for level_def in group_def["levels"]:
        level_name = level_def["name"]
        role_name = None
        if group == "quest":
            prefix = level_name.split("-")[0]
            role_name = QUEST_ROLE_BY_PREFIX.get(prefix)
            if not role_name:
                raise RuntimeError(f"unknown quest role prefix for {level_name}")

        print(f"  seed={seed} group={group} level={level_name}")
        wiz = run_wizload(seed, level_name, role_name=role_name)
        levels_out.append(extract_level_data(wiz, level_def, role_name=role_name))

    out_data = {
        "version": 2,
        "seed": int(seed),
        "type": "special",
        "source": "c",
        "group": group,
        "screenMode": "decgraphics",
        "levels": levels_out,
    }
    out_path = MAPS_DIR / f"seed{seed}_special_{group}.session.json"
    with out_path.open("w") as f:
        json.dump(out_data, f, indent=2)
        f.write("\n")
    print(f"  wrote {out_path}")


def discover_targets():
    targets = []
    for p in sorted(MAPS_DIR.glob("seed*_special_*.session.json")):
        m = SPECIAL_FILE_RE.match(p.name)
        if not m:
            continue
        targets.append((int(m.group("seed")), m.group("group")))
    return targets


def main():
    parser = argparse.ArgumentParser(description="Regenerate legacy grouped special-map files")
    parser.add_argument("--seed", type=int, action="append", help="Only regenerate this seed (repeatable)")
    parser.add_argument("--group", action="append", help="Only regenerate this group (repeatable)")
    args = parser.parse_args()

    targets = discover_targets()
    if args.seed:
        allowed = set(args.seed)
        targets = [t for t in targets if t[0] in allowed]
    if args.group:
        allowed = set(args.group)
        targets = [t for t in targets if t[1] in allowed]

    if not targets:
        print("No matching special map targets found.")
        return

    print(f"Regenerating {len(targets)} grouped special map files...")
    for seed, group in targets:
        print(f"\n=== seed{seed}_special_{group} ===")
        regenerate_special_group(seed, group)
    print("\nDone.")


if __name__ == "__main__":
    main()
