#!/usr/bin/env python3
"""Capture a C NetHack auto-checkpoint after replaying session steps.

Usage:
  python3 capture_step_snapshot.py <session_json> <step_index> <output_json>

step_index is 0-based over gameplay steps (session.steps excluding startup).
Example: step_index 37 replays 38 gameplay steps, then captures env-triggered
checkpoint emitted at the canonical runstep boundary (no injected tty commands).
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
import time

from run_session import (
    CHARACTER,
    INSTALL_DIR,
    NETHACK_BINARY,
    RESULTS_DIR,
    clear_more_prompts,
    fixed_datetime_env,
    get_clear_more_stats,
    read_checkpoint_entries,
    read_rng_log,
    parse_rng_lines,
    setup_home,
    no_delay_env,
    diag_events_env,
    test_move_event_env,
    runstep_event_env,
    tmux_capture,
    tmux_send,
    tmux_send_special,
    wait_for_game_ready,
)


def load_session(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_keys(session):
    raw_steps = session.get("steps") or []
    keys = []
    for i, step in enumerate(raw_steps):
        if i == 0 and (step.get("key") is None or step.get("action") == "startup"):
            continue
        key = step.get("key")
        if not isinstance(key, str):
            continue
        keys.append(key)
    return keys


def build_character(session):
    opts = session.get("options") or {}
    char = dict(CHARACTER)
    for k in ("name", "role", "race", "gender", "align"):
        if isinstance(opts.get(k), str) and opts.get(k):
            char[k] = opts[k]
    return char


def send_char(session_name, ch):
    code = ord(ch)
    if code in (10, 13):
        tmux_send_special(session_name, "Enter")
    elif code == 27:
        tmux_send_special(session_name, "Escape")
    elif code == 127:
        tmux_send_special(session_name, "BSpace")
    elif code < 32:
        tmux_send_special(session_name, f"C-{chr(code + 96)}")
    else:
        tmux_send(session_name, ch)


def replay_steps(session_name, keys, step_index):
    target = min(step_index + 1, len(keys))
    key_delay_s = float(os.environ.get("NETHACK_KEY_DELAY_S", "0.02"))
    sent_chars = 0
    for idx in range(target):
        key = keys[idx]
        # Session gameplay keys are expected to be single-char, but handle
        # multi-char defensively for compatibility with hand-edited traces.
        for ch in key:
            send_char(session_name, ch)
            sent_chars += 1
            time.sleep(max(0.0, key_delay_s))
    return target, sent_chars


def emit_manual_dumpsnap_checkpoint(session_name, phase_tag):
    """Emit one checkpoint via wizard #dumpsnap command."""
    # Extended command prefix.
    tmux_send(session_name, "#")
    time.sleep(0.05)
    # Command name.
    tmux_send(session_name, "dumpsnap")
    time.sleep(0.02)
    tmux_send_special(session_name, "Enter")
    time.sleep(0.05)
    # Prompt asks for phase tag; provide expected auto_inp tag.
    tmux_send(session_name, phase_tag)
    time.sleep(0.02)
    tmux_send_special(session_name, "Enter")


def wait_for_checkpoint_phase_prefix(checkpoint_file, expected_prefix, baseline_count, timeout_s=20.0):
    """Poll checkpoint file until a checkpoint whose phase starts with prefix appears."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        checkpoints, _ = read_checkpoint_entries(checkpoint_file, 0)
        if len(checkpoints) > baseline_count:
            for cp in reversed(checkpoints):
                phase = cp.get("phase") or ""
                if phase.startswith(expected_prefix):
                    return cp, len(checkpoints)
        time.sleep(0.05)
    return None, baseline_count


def find_checkpoint_by_phase_prefix(checkpoints, phase_prefix, baseline_count=0):
    """Return newest checkpoint whose phase starts with phase_prefix, else None."""
    if not phase_prefix:
        return None
    start = max(0, int(baseline_count))
    for cp in reversed((checkpoints or [])[start:]):
        phase = str((cp or {}).get("phase") or "")
        if phase.startswith(phase_prefix):
            return cp
    return None


def wait_for_checkpoint_best_match(
    checkpoint_file,
    baseline_count,
    primary_prefix,
    secondary_prefix=None,
    timeout_s=20.0,
    settle_s=1.0,
):
    """Wait for checkpoints; prefer primary/secondary phase matches over first growth.

    This avoids grabbing an early phase (for example, after_map) when the
    expected auto_inp_* phase appears slightly later in the same transition.
    """
    deadline = time.time() + timeout_s
    last_count = baseline_count
    last_growth_t = None
    latest = None
    while time.time() < deadline:
        checkpoints, _ = read_checkpoint_entries(checkpoint_file, 0)
        count = len(checkpoints)
        if count > baseline_count:
            latest = checkpoints[-1]
            if count != last_count:
                last_count = count
                last_growth_t = time.time()
            primary = find_checkpoint_by_phase_prefix(checkpoints, primary_prefix, baseline_count)
            if primary is not None:
                return primary, checkpoints, count
            secondary = find_checkpoint_by_phase_prefix(checkpoints, secondary_prefix, baseline_count)
            if secondary is not None:
                return secondary, checkpoints, count
            if last_growth_t is not None and (time.time() - last_growth_t) >= settle_s:
                return latest, checkpoints, count
        time.sleep(0.05)
    checkpoints, _ = read_checkpoint_entries(checkpoint_file, 0)
    count = len(checkpoints)
    if count > 0:
        latest = checkpoints[-1]
    return latest, checkpoints, count


_AUTO_STEP_RE = re.compile(r"^auto_step_(\d+)")
_AUTO_INP_RE = re.compile(r"^auto_inp_(\d+)")
_CKPT_PHASE_RE = re.compile(r"^\^ckpt\[phase=([^ ]+)")
_RUNSTEP_PATH_RE = re.compile(r"^\^runstep\[path=([^ ]+)")


def max_auto_index(checkpoints, pattern):
    max_idx = -1
    for cp in checkpoints or []:
        phase = str((cp or {}).get("phase") or "")
        m = pattern.match(phase)
        if not m:
            continue
        try:
            idx = int(m.group(1))
        except (TypeError, ValueError):
            continue
        if idx > max_idx:
            max_idx = idx
    return max_idx


def wait_for_target_runstep_rng(rng_log_file, target_runstep_index, timeout_s=120.0):
    """Wait until C RNG/event stream has at least target runstep index."""
    deadline = time.time() + timeout_s
    last_lines = []
    while time.time() < deadline:
        _, lines = read_rng_log(rng_log_file)
        last_lines = lines
        entries = parse_rng_lines(lines)
        runstep_idx = -1
        for e in entries:
            text = str(e or "")
            m = _RUNSTEP_PATH_RE.match(text)
            if not m:
                continue
            if m.group(1) == "repeat_cmd_done":
                continue
            runstep_idx += 1
            if runstep_idx >= target_runstep_index:
                return lines
        time.sleep(0.05)
    return last_lines


def checkpoint_phase_for_runstep_index(rng_lines, target_runstep_index):
    """Pick latest ckpt phase at/before target runstep event in unified stream."""
    entries = parse_rng_lines(rng_lines)
    runstep_idx = -1
    target_entry_pos = -1
    ckpt_by_pos = []
    for pos, e in enumerate(entries):
        text = str(e or "")
        m_ckpt = _CKPT_PHASE_RE.match(text)
        if m_ckpt:
            ckpt_by_pos.append((pos, m_ckpt.group(1)))
        m_rs = _RUNSTEP_PATH_RE.match(text)
        if m_rs:
            if m_rs.group(1) == "repeat_cmd_done":
                continue
            runstep_idx += 1
            if runstep_idx == target_runstep_index:
                target_entry_pos = pos
                break
    if target_entry_pos < 0:
        return None
    best = None
    for pos, phase in ckpt_by_pos:
        if pos <= target_entry_pos:
            best = phase
        else:
            break
    return best


def run_capture(session_path, step_index, output_path, phase_tag=None, keys_override=None):
    session = load_session(session_path)
    keys = keys_override if keys_override is not None else extract_keys(session)
    seed = int(session.get("seed", 1))
    char = build_character(session)

    setup_home(char)

    tmpdir = tempfile.mkdtemp(prefix="webhack-step-snapshot-")
    rng_log_file = os.path.join(tmpdir, "rnglog.txt")
    checkpoint_file = os.path.join(tmpdir, "checkpoints.jsonl")
    session_name = f"webhack-step-snapshot-{seed}-{os.getpid()}"

    try:
        monmove_debug = os.environ.get("NETHACK_MONMOVE_DEBUG")
        monmove_debug_env = (
            f"NETHACK_MONMOVE_DEBUG={monmove_debug} " if monmove_debug else ""
        )
        key_steps_env = os.environ.get("NETHACK_DUMPSNAP_KEY_STEPS")
        key_steps_clause = (
            f"NETHACK_DUMPSNAP_KEY_STEPS={key_steps_env} " if key_steps_env else ""
        )
        cmd = (
            f"NETHACKDIR={INSTALL_DIR} "
            f"{fixed_datetime_env()}"
            f"{diag_events_env()}"
            f"{no_delay_env()}"
            f"{test_move_event_env()}"
            f"{runstep_event_env()}"
            f"{monmove_debug_env}"
            f"NETHACK_SEED={seed} "
            f"NETHACK_RNGLOG={rng_log_file} "
            f"NETHACK_DUMPSNAP={checkpoint_file} "
            f"NETHACK_DUMPSNAP_STEPS={step_index} "
            f"{key_steps_clause}"
            f"NETHACK_DUMPSNAP_INPUT_EVERY=1 "
            f"HOME={RESULTS_DIR} "
            f"TERM=xterm-256color "
            f"{NETHACK_BINARY} -u {char['name']} -D; "
            f"sleep 999"
        )
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", session_name, "-x", "80", "-y", "24", cmd],
            check=True,
        )
        time.sleep(1.0)

        wait_for_game_ready(session_name, rng_log_file)
        time.sleep(0.02)
        # When replaying explicit keys from dbgmapdump (--keys-json), those keys
        # are gameplay-only and expect startup lore/prompt boundaries to be
        # already dismissed. Clear startup --More-- only in that mode.
        if keys_override is not None:
            clear_more_prompts(session_name)
            time.sleep(0.02)

        checkpoints_before, _ = read_checkpoint_entries(checkpoint_file, 0)
        baseline_count = len(checkpoints_before)
        baseline_auto_step = max_auto_index(checkpoints_before, _AUTO_STEP_RE)
        baseline_auto_inp = max_auto_index(checkpoints_before, _AUTO_INP_RE)
        replayed_steps, replayed_chars = replay_steps(session_name, keys, step_index)
        pre_snapshot_screen = tmux_capture(session_name)
        expected_auto_step = baseline_auto_step + replayed_steps
        expected_auto_inp = baseline_auto_inp + replayed_chars
        target_auto_inp_by_step = int(step_index)
        # Prefer the absolute auto_inp index derived from replayed key chars.
        # Using session step index directly can select stale checkpoints when
        # input and gameplay-step numbering diverge.
        target_auto_inp = int(expected_auto_inp)
        tag = phase_tag or f"auto_inp_{target_auto_inp}"

        matched_checkpoint, checkpoint_count = wait_for_checkpoint_phase_prefix(
            checkpoint_file, tag, baseline_count, timeout_s=6.0
        )
        checkpoints, _ = read_checkpoint_entries(checkpoint_file, 0)

        matched_phase_from_stream = None
        runstep_events_enabled = bool(os.environ.get("NETHACK_EVENT_RUNSTEP"))
        if matched_checkpoint is None and runstep_events_enabled:
            rng_lines = wait_for_target_runstep_rng(rng_log_file, step_index)
            matched_phase_from_stream = checkpoint_phase_for_runstep_index(rng_lines, step_index)
        if matched_checkpoint is None:
            fallback_cp, checkpoints, checkpoint_count = wait_for_checkpoint_best_match(
                checkpoint_file,
                baseline_count,
                tag,
                matched_phase_from_stream,
                timeout_s=6.0,
                settle_s=0.5,
            )
            # Only promote fallback capture to matched when phase aligns.
            phase = str((fallback_cp or {}).get("phase") or "")
            if phase.startswith(tag) or (
                matched_phase_from_stream and phase.startswith(matched_phase_from_stream)
            ):
                matched_checkpoint = fallback_cp
            else:
                matched_checkpoint = None
        if matched_checkpoint is None:
            # Fallback for C builds that do not emit auto_inp_* checkpoints:
            # trigger one explicit no-time wizard checkpoint at this boundary.
            emit_manual_dumpsnap_checkpoint(session_name, tag)
            manual_cp, checkpoint_count = wait_for_checkpoint_phase_prefix(
                checkpoint_file, tag, baseline_count, timeout_s=8.0
            )
            if manual_cp is not None:
                matched_checkpoint = manual_cp
                checkpoints, _ = read_checkpoint_entries(checkpoint_file, 0)
        chosen_checkpoint = matched_checkpoint if matched_checkpoint is not None else (checkpoints[-1] if checkpoints else None)
        if matched_checkpoint:
            tag = str(matched_checkpoint.get("phase") or tag)
        rng_count, _ = read_rng_log(rng_log_file)
        checkpoint_phases_tail = [str((cp or {}).get("phase") or "") for cp in checkpoints[-8:]]

        payload = {
            "session": os.path.abspath(session_path),
            "seed": seed,
            "requestedStepIndex": step_index,
            "replayedSteps": replayed_steps,
            "phaseTag": tag,
            "baselineAutoStep": baseline_auto_step,
            "baselineAutoInp": baseline_auto_inp,
            "baselineCheckpointCount": baseline_count,
            "expectedAutoStep": expected_auto_step,
            "expectedAutoInp": expected_auto_inp,
            "targetAutoInp": target_auto_inp,
            "targetAutoInpByStep": target_auto_inp_by_step,
            "replayedChars": replayed_chars,
            "matchedPhaseFromStream": matched_phase_from_stream,
            "rngCallCount": rng_count,
            "checkpointCount": checkpoint_count if matched_checkpoint else len(checkpoints),
            "checkpointMatchedPhase": bool(matched_checkpoint),
            "checkpoint": chosen_checkpoint,
            "checkpointPhasesTail": checkpoint_phases_tail,
            "preSnapshotScreen": pre_snapshot_screen,
            "screen": tmux_capture(session_name),
            "clearMore": get_clear_more_stats(),
        }

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
            f.write("\n")
    finally:
        subprocess.run(["tmux", "kill-session", "-t", session_name], capture_output=True)
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("session_json", help="Path to *.session.json")
    parser.add_argument("step_index", type=int, help="0-based gameplay step index")
    parser.add_argument("output_json", help="Output file path for captured snapshot JSON")
    parser.add_argument("--phase", default=None, help="Optional phase tag prefix for auto-checkpoint matching")
    parser.add_argument(
        "--keys-json",
        default=None,
        help="Optional JSON file containing an explicit replay key array to use instead of extracting from session steps",
    )
    args = parser.parse_args()
    keys_override = None
    if args.keys_json:
        with open(args.keys_json, "r", encoding="utf-8") as f:
            loaded = json.load(f)
        if isinstance(loaded, str):
            keys_override = list(loaded)
        elif isinstance(loaded, list) and all(isinstance(k, str) for k in loaded):
            keys_override = loaded
        else:
            raise ValueError("--keys-json must be a JSON string or array of strings")

    run_capture(args.session_json, args.step_index, args.output_json, args.phase, keys_override)


if __name__ == "__main__":
    main()
