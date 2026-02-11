#!/usr/bin/env python3
"""Generate interface session traces from C NetHack for UI accuracy testing.

Captures:
1. Startup sequence (tutorial prompt, copyright screen)
2. Options menu (dense listing with [x] marks, ? help view)
3. Terminal attributes (inverse video, bold, etc.)

Usage:
    python3 gen_interface_sessions.py --startup
    python3 gen_interface_sessions.py --options

Output: test/comparison/sessions/interface_*.session.json
"""

import sys
import os
import json
import time
import subprocess
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')
NETHACK_BINARY = os.path.join(PROJECT_ROOT, 'nethack-c', 'install', 'games', 'lib', 'nethackdir', 'nethack')

def tmux_session_name():
    """Generate unique tmux session name."""
    return f"nethack-interface-{os.getpid()}"

def start_tmux_session(session):
    """Start a tmux session with 80x24 dimensions."""
    subprocess.run([
        'tmux', 'new-session', '-d', '-s', session,
        '-x', '80', '-y', '24'
    ], check=True)
    time.sleep(0.1)

def tmux_send(session, keys, delay=0.2):
    """Send keys to tmux session."""
    subprocess.run(['tmux', 'send-keys', '-t', session, keys], check=True)
    time.sleep(delay)

def capture_screen_with_attrs(session):
    """Capture screen content AND attributes from tmux.

    Returns:
        tuple: (lines, attrs) where both are 24-element arrays
        - lines: plain text content
        - attrs: attribute codes (0=normal, 1=inverse, 2=bold, etc.)
    """
    # Capture plain text
    result = subprocess.run(
        ['tmux', 'capture-pane', '-t', session, '-p', '-J'],
        capture_output=True, text=True, check=True
    )
    lines = result.stdout.rstrip('\n').split('\n')
    while len(lines) < 24:
        lines.append('')
    lines = lines[:24]

    # Capture with escape codes to parse attributes
    result_esc = subprocess.run(
        ['tmux', 'capture-pane', '-t', session, '-p', '-e'],
        capture_output=True, text=True, check=True
    )

    # Parse escape codes to build attribute array
    attrs = parse_attributes(result_esc.stdout, lines)

    return lines, attrs

def parse_attributes(escaped_text, plain_lines):
    """Parse ANSI escape codes to build attribute array.

    Returns array of 24 strings, each 80 chars, with attribute codes:
    - '0' = normal
    - '1' = inverse/reverse video
    - '2' = bold
    - '4' = underline
    """
    attrs = []
    for line in plain_lines:
        # For now, create all-normal attrs (we'll enhance this)
        attrs.append('0' * len(line) + '0' * (80 - len(line)))

    # TODO: Parse escape codes like \x1b[7m (inverse), \x1b[1m (bold)
    # This is a placeholder - full implementation needed

    return attrs[:24]

def kill_tmux_session(session):
    """Kill the tmux session."""
    subprocess.run(['tmux', 'kill-session', '-t', session],
                   stderr=subprocess.DEVNULL, check=False)

def capture_startup_sequence():
    """Capture the full startup sequence including tutorial prompt."""
    session = tmux_session_name()
    start_tmux_session(session)

    steps = []

    try:
        # Start NetHack with TERM set
        nethack_dir = os.path.dirname(NETHACK_BINARY)
        tmux_send(session, f'cd {nethack_dir}', delay=0.2)
        tmux_send(session, 'clear', delay=0.2)
        tmux_send(session, 'TERM=xterm ./nethack', delay=0.5)

        # Wait for game to start and display first screen
        time.sleep(1.5)

        # Capture initial screen (tutorial prompt or copyright)
        lines, attrs = capture_screen_with_attrs(session)
        steps.append({
            "key": "startup",
            "description": "Initial screen on game launch",
            "screen": lines,
            "attrs": attrs
        })

        # If tutorial prompt appears, capture response
        if any('tutorial' in line.lower() for line in lines):
            # Press 'n' to decline tutorial
            tmux_send(session, 'n')
            time.sleep(0.3)
            lines, attrs = capture_screen_with_attrs(session)
            steps.append({
                "key": "n",
                "description": "Decline tutorial",
                "screen": lines,
                "attrs": attrs
            })

        # Continue through startup...
        # (more steps to be added)

    finally:
        kill_tmux_session(session)

    return {
        "version": 2,
        "type": "interface",
        "subtype": "startup",
        "description": "Game startup sequence including tutorial prompt",
        "steps": steps
    }

def capture_options_menu():
    """Capture the options menu interface."""
    session = tmux_session_name()
    start_tmux_session(session)

    steps = []

    try:
        # Start NetHack and get to main game
        tmux_send(session, f'cd {os.path.dirname(NETHACK_BINARY)} && ./nethack -u wizard -D')
        time.sleep(1.0)

        # Skip startup prompts (adapt based on what appears)
        tmux_send(session, 'n')  # Decline autopick
        time.sleep(0.3)
        tmux_send(session, 'y')  # Confirm character
        time.sleep(0.5)

        # Open options menu with 'O'
        tmux_send(session, 'O')
        time.sleep(0.3)

        lines, attrs = capture_screen_with_attrs(session)
        steps.append({
            "key": "O",
            "description": "Options menu main view",
            "screen": lines,
            "attrs": attrs
        })

        # Press '?' for help/alternate view
        tmux_send(session, '?')
        time.sleep(0.3)

        lines, attrs = capture_screen_with_attrs(session)
        steps.append({
            "key": "?",
            "description": "Options menu help/alternate view",
            "screen": lines,
            "attrs": attrs
        })

        # Navigate pages with > and <
        tmux_send(session, '>')
        time.sleep(0.3)

        lines, attrs = capture_screen_with_attrs(session)
        steps.append({
            "key": ">",
            "description": "Options menu page 2",
            "screen": lines,
            "attrs": attrs
        })

        # More exploration steps...

    finally:
        kill_tmux_session(session)

    return {
        "version": 2,
        "type": "interface",
        "subtype": "options",
        "description": "Options menu interface with all views",
        "steps": steps
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: gen_interface_sessions.py [--startup|--options]")
        sys.exit(1)

    os.makedirs(SESSIONS_DIR, exist_ok=True)

    if sys.argv[1] == '--startup':
        data = capture_startup_sequence()
        outfile = os.path.join(SESSIONS_DIR, 'interface_startup.session.json')
    elif sys.argv[1] == '--options':
        data = capture_options_menu()
        outfile = os.path.join(SESSIONS_DIR, 'interface_options.session.json')
    else:
        print(f"Unknown option: {sys.argv[1]}")
        sys.exit(1)

    with open(outfile, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Generated {outfile}")
    print(f"   {len(data['steps'])} steps captured")

if __name__ == '__main__':
    main()
