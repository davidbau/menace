#!/usr/bin/env python3
"""Audit rerecorded sessions against a baseline snapshot.

Reports:
1) Structural drift: step count/keystream changes
2) PRNG drift: startup/step RNG arrays differ
3) Command outcome hints for '>'/'<' (ascend/descend)

Designed for iterative checks while rerecord is still running.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from dataclasses import dataclass
from typing import Iterable


ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
GFX_RE = re.compile(r"[\x0e\x0f]")
DLVL_RE = re.compile(r"\b(?:Dlvl|Dlvl:)\s*:?\s*(\d+)\b", re.IGNORECASE)
BRANCH_RE = re.compile(
    r"\b(Tutorial|Mine|Mines|Sokoban|Quest|Fort Ludios|Gehennom|Astral|Plane)\s*:\s*(\d+)\b",
    re.IGNORECASE,
)


@dataclass
class DriftRow:
    name: str
    prng_changed: bool
    step_old: int
    step_new: int
    key_changed: bool
    rng_old: int
    rng_new: int


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_text(raw: str) -> str:
    text = ANSI_RE.sub("", raw)
    text = GFX_RE.sub("", text)
    return text.lower()


def step_text(step: dict) -> str:
    parts: list[str] = []
    screen = step.get("screen")
    if isinstance(screen, str):
        parts.append(screen)
    elif isinstance(screen, list):
        parts.append("\n".join(str(x) for x in screen))
    events = step.get("events")
    if isinstance(events, list):
        for e in events:
            if isinstance(e, str):
                parts.append(e)
    topline = step.get("topLine")
    if isinstance(topline, str):
        parts.append(topline)
    return normalize_text("\n".join(parts))


def parse_level_id(text: str) -> str | None:
    m = DLVL_RE.search(text)
    if m:
        return f"Dlvl:{m.group(1)}"
    m = BRANCH_RE.search(text)
    if m:
        return f"{m.group(1).lower()}:{m.group(2)}"
    return None


def key_stream(steps: list[dict]) -> str:
    return "".join(str(s.get("key", "")) for s in steps)


def total_rng(steps: list[dict]) -> int:
    return sum(len(s.get("rng", [])) for s in steps if isinstance(s.get("rng", []), list))


def prng_diff(old: dict, new: dict) -> bool:
    old_start = old.get("startup", {}).get("rng", [])
    new_start = new.get("startup", {}).get("rng", [])
    if old_start != new_start:
        return True
    old_steps = [s.get("rng", []) for s in old.get("steps", [])]
    new_steps = [s.get("rng", []) for s in new.get("steps", [])]
    return old_steps != new_steps


def changed_sessions(sessions_dir: str) -> Iterable[str]:
    cmd = f"git status --short {sessions_dir}"
    out = subprocess.check_output(["bash", "-lc", cmd], text=True)
    for line in out.splitlines():
        if not line:
            continue
        path = line[3:].strip()
        if path.endswith(".session.json"):
            yield path


def gtlt_outcomes(steps: list[dict]) -> list[tuple[int, str, str]]:
    down_msgs = ("you descend", "go down", "downstairs", "stairs down")
    up_msgs = ("you ascend", "go up", "upstairs", "stairs up")
    blocked_msgs = ("cannot", "nothing happens", "no stairs", "not here")

    outcomes: list[tuple[int, str, str]] = []
    for i, step in enumerate(steps):
        key = str(step.get("key", ""))
        if key not in (">", "<"):
            continue
        window = "\n".join(step_text(steps[j]) for j in range(i, min(i + 5, len(steps))))
        if key == ">" and any(msg in window for msg in down_msgs):
            outcomes.append((i + 1, key, "ok"))
        elif key == "<" and any(msg in window for msg in up_msgs):
            outcomes.append((i + 1, key, "ok"))
        elif any(msg in window for msg in blocked_msgs):
            outcomes.append((i + 1, key, "fail"))
        else:
            # Fallback to level-id change detection (Dlvl:x or Branch:y).
            before = parse_level_id(step_text(steps[i - 1])) if i > 0 else None
            after = None
            for j in range(i, min(i + 6, len(steps))):
                after = parse_level_id(step_text(steps[j]))
                if after and before and after != before:
                    break
            if before and after and before != after:
                outcomes.append((i + 1, key, "ok"))
            else:
                outcomes.append((i + 1, key, "unknown"))
    return outcomes


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit rerecord drift against baseline sessions")
    parser.add_argument("--baseline-dir", required=True, help="Directory of baseline session JSON files")
    parser.add_argument("--sessions-dir", default="test/comparison/sessions", help="Current sessions directory")
    parser.add_argument("--changed-only", action="store_true", help="Only inspect sessions changed in git status")
    args = parser.parse_args()

    if args.changed_only:
        current_paths = list(changed_sessions(args.sessions_dir))
    else:
        current_paths = [
            os.path.join(args.sessions_dir, f)
            for f in sorted(os.listdir(args.sessions_dir))
            if f.endswith(".session.json")
        ]

    drift_rows: list[DriftRow] = []
    gtlt_summary = {"total": 0, "ok": 0, "fail": 0, "unknown": 0}
    gtlt_bad: list[tuple[str, list[tuple[int, str, str]]]] = []

    for cur in current_paths:
        name = os.path.basename(cur)
        base = os.path.join(args.baseline_dir, name)
        if not os.path.exists(cur) or not os.path.exists(base):
            continue
        old = load_json(base)
        new = load_json(cur)

        old_steps = old.get("steps", [])
        new_steps = new.get("steps", [])
        row = DriftRow(
            name=name,
            prng_changed=prng_diff(old, new),
            step_old=len(old_steps),
            step_new=len(new_steps),
            key_changed=(key_stream(old_steps) != key_stream(new_steps)),
            rng_old=total_rng(old_steps),
            rng_new=total_rng(new_steps),
        )
        drift_rows.append(row)

        outcomes = gtlt_outcomes(new_steps)
        if outcomes:
            bad = []
            for _, _, status in outcomes:
                gtlt_summary["total"] += 1
                gtlt_summary[status] += 1
            bad = [o for o in outcomes if o[2] != "ok"]
            if bad:
                gtlt_bad.append((name, bad))

    print(f"audited_sessions={len(drift_rows)}")
    suspects = [r for r in drift_rows if r.prng_changed or r.step_old != r.step_new or r.key_changed]
    print(f"suspect_sessions={len(suspects)}")
    for r in sorted(suspects, key=lambda x: x.name):
        print(
            f"  {r.name}: prng={int(r.prng_changed)} "
            f"steps {r.step_old}->{r.step_new} "
            f"keysChanged={int(r.key_changed)} rng {r.rng_old}->{r.rng_new}"
        )

    print(
        "gtlt_overall: "
        f"total={gtlt_summary['total']} ok={gtlt_summary['ok']} "
        f"fail={gtlt_summary['fail']} unknown={gtlt_summary['unknown']}"
    )
    if gtlt_bad:
        print("gtlt_non_ok:")
        for name, items in gtlt_bad:
            details = ", ".join(f"step{idx}{key}:{status}" for idx, key, status in items)
            print(f"  {name}: {details}")


if __name__ == "__main__":
    main()
