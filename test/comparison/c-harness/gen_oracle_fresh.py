#!/usr/bin/env python3
"""Generate oracle level using #wizloaddes to force fresh generation."""

import sys
import os
import time
import tempfile
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
INSTALL_DIR = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir')
NETHACK_BINARY = os.path.join(INSTALL_DIR, 'nethack')
DEFAULT_FIXED_DATETIME = '20000110090000'


def fixed_datetime_env():
    dt = os.environ.get('NETHACK_FIXED_DATETIME')
    if dt is None:
        dt = DEFAULT_FIXED_DATETIME
    return f'NETHACK_FIXED_DATETIME={dt} ' if dt else ''

def run_wizloaddes(seed):
    """Run NetHack with #wizloaddes to force oracle generation."""
    print(f"\n=== Generating Oracle with #wizloaddes (seed {seed}) ===")

    tmpdir = tempfile.mkdtemp(prefix=f'oracle-wizload-{seed}-')
    rnglog_file = os.path.join(tmpdir, 'rnglog.txt')

    # Use expect/pexpect would be ideal, but let's use tmux
    session_name = f'oracle-wizload-{seed}-{os.getpid()}'

    try:
        cmd = (
            f'{fixed_datetime_env()}'
            f'NETHACKDIR={INSTALL_DIR} '
            f'NETHACK_SEED={seed} '
            f'NETHACK_RNGLOG={rnglog_file} '
            f'HOME={tmpdir} '
            f'TERM=xterm-256color '
            f'{NETHACK_BINARY} -u Wizard -D'
        )
        subprocess.run(
            ['tmux', 'new-session', '-d', '-s', session_name, cmd],
            check=True
        )

        def send(text, delay=0.3):
            subprocess.run(['tmux', 'send-keys', '-t', session_name, text], check=True)
            time.sleep(delay)

        def send_enter(delay=0.5):
            subprocess.run(['tmux', 'send-keys', '-t', session_name, 'Enter'], check=True)
            time.sleep(delay)

        # Wait for game start
        time.sleep(2.0)

        # Skip tutorial prompt
        send('n', 0.5)

        # Use #wizloaddes
        send('#wizloaddes', 0.5)
        send_enter(0.5)

        # Type oracle
        send('oracle', 0.5)
        send_enter(0.5)

        # Confirm if prompted
        send('y', 0.5)

        # Wait for level to generate
        time.sleep(1.0)

        # Quit
        send('#quit', 0.5)
        send_enter(0.5)
        send('y', 0.5)

        # Wait for quit
        time.sleep(0.5)

        # Check rnglog
        if os.path.exists(rnglog_file):
            with open(rnglog_file) as f:
                lines = f.readlines()

            load_special_lines = [l for l in lines if 'LOAD_SPECIAL' in l]
            rect_split_lines = [l for l in lines if 'RECT_SPLIT' in l]

            print(f"\n  RNG log has {len(lines)} lines")
            print(f"  LOAD_SPECIAL calls: {len(load_special_lines)}")
            print(f"  RECT_SPLIT calls: {len(rect_split_lines)}")

            if load_special_lines:
                print("\n  LOAD_SPECIAL lines:")
                for line in load_special_lines[:5]:
                    print(f"    {line.strip()}")

            if rect_split_lines:
                print("\n  RECT_SPLIT lines:")
                for line in rect_split_lines[:10]:
                    print(f"    {line.strip()}")
            else:
                print("\n  WARNING: No RECT_SPLIT lines found!")
        else:
            print(f"\n  ERROR: rnglog not created at {rnglog_file}")

    finally:
        subprocess.run(['tmux', 'kill-session', '-t', session_name],
                      capture_output=True)

if __name__ == '__main__':
    run_wizloaddes(42)
