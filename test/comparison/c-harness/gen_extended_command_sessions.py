#!/usr/bin/env python3
"""Generate C NetHack session traces exercising extended commands.

Commands covered:
  #enhance  -- skill advancement (wizard mode: #levelchange to gain XP first)
  #chat     -- talk to monster (Ctrl-G to spawn one, then #chat + direction)
  #offer    -- sacrifice at altar (try #offer when not on altar)
  #monster  -- polymorphed special ability (Ctrl-W wish poly potion, drink, #monster)
               also records non-polymorphed response for completeness

Notes on C wizard mode:
  - #levelchange  works as a text extended command
  - Ctrl-G (\x07) = #wizgenesis — create monster
  - Ctrl-W (\x17) = #wizwish — wish for item
  - #polyself works as a text extended command (polymorph self)
  - #enhance works as a text extended command
  - #chat works as a text extended command
  - #offer works as a text extended command

The move strings use raw_moves=True so characters in command text are sent
literally without parse_moves() interpreting 's', 'i', etc. as game commands.
Raw special chars: \\n = Enter, \\x1b = Escape, \\x07 = Ctrl-G, \\x17 = Ctrl-W.

Usage:
    python3 gen_extended_command_sessions.py --enhance
    python3 gen_extended_command_sessions.py --chat
    python3 gen_extended_command_sessions.py --offer
    python3 gen_extended_command_sessions.py --monster
    python3 gen_extended_command_sessions.py --all

Output: test/comparison/sessions/pending/seed500_extcmd_<cmd>.session.json
         (in 'pending' subdir so they don't run until JS implementations exist)
"""

import sys
import os
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions', 'pending')

# Import run_session helpers
_spec = importlib.util.spec_from_file_location(
    'run_session', os.path.join(SCRIPT_DIR, 'run_session.py'))
_rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_rs)


CHARACTER = {
    'name': 'Tutes',
    'role': 'Wizard',
    'race': 'human',
    'gender': 'male',
    'align': 'neutral',
}

# Extended command as raw bytes: '#' + text + Enter
def extcmd(cmd):
    return '#' + cmd + '\n'

# Ctrl keys for C wizard mode
CTRL_G = '\x07'   # Ctrl-G = #wizgenesis (create monster)
CTRL_W = '\x17'   # Ctrl-W = #wizwish (wish for item)
ESC    = '\x1b'
SP     = ' '


def capture_enhance(seed=500):
    """#enhance after #levelchange to XP 5 — enough for skill advancement.

    C behavior: shows skill menu with advanceable skills. Player can select
    one to advance. ESC exits without advancing.
    """
    print(f'Capturing #enhance (seed {seed})...')
    moves = (
        # Set XP to 5 so there are skill advancement points available
        extcmd('levelchange') + '5\n'
        + SP * 3               # dismiss levels 2, 3, 4 --More-- prompts (level 5 has none)
        # Now show #enhance menu
        + extcmd('enhance')
        + SP                   # answer "Advance skills without practice? [yn]" / open menu
        + ESC                  # exit the skill menu without advancing
    )
    out = os.path.join(SESSIONS_DIR, f'seed{seed}_extcmd_enhance.session.json')
    _rs.run_session(seed, out, moves, raw_moves=True, wizard_mode=True, character=CHARACTER)
    print(f'  -> {out}')


def capture_chat(seed=501):
    """#chat after Ctrl-G genesis to spawn a monster, then direction south.

    C behavior: "Talk to whom? (in what direction)" → direction key → monster
    says something (or "It doesn't seem interested in talking.").
    """
    print(f'Capturing #chat (seed {seed})...')
    moves = (
        # Ctrl-G = #wizgenesis: type monster name then Enter to create it
        # (creation message has no --More--, so no space needed after)
        CTRL_G + 'kobold\n'
        # #chat: prompts for direction
        + extcmd('chat')
        + 'j'                  # direction: south (towards spawned monster)
        # chat response has no --More-- in this case
    )
    out = os.path.join(SESSIONS_DIR, f'seed{seed}_extcmd_chat.session.json')
    _rs.run_session(seed, out, moves, raw_moves=True, wizard_mode=True, character=CHARACTER)
    print(f'  -> {out}')


def capture_offer(seed=502):
    """#offer when not on an altar — C says 'You are not on an altar.'

    Also records what happens when item selection is prompted (ESC = never mind).
    """
    print(f'Capturing #offer (seed {seed})...')
    moves = (
        # Just try #offer — player starts on tutorial floor, no altar there
        extcmd('offer')
        # No additional keys needed: C prints 'You are not on an altar.' and returns
    )
    out = os.path.join(SESSIONS_DIR, f'seed{seed}_extcmd_offer.session.json')
    _rs.run_session(seed, out, moves, raw_moves=True, wizard_mode=True, character=CHARACTER)
    print(f'  -> {out}')


def capture_monster(seed=503):
    """#monster in normal (non-polymorphed) form — C says 'You don't have a
    special ability in your normal form!'

    Also records the polymorphed case: Ctrl-W wish poly potion, quaff into
    red dragon form (wizard mode prompts "Become what kind of monster?"),
    then #monster to use fire breath ability.
    """
    print(f'Capturing #monster (seed {seed})...')
    moves = (
        # First: #monster without polymorph — shows normal-form message (no --More--)
        extcmd('monster')
        # Second: polymorph via Ctrl-W wish + quaff, then #monster
        # Wish for blessed potion of polymorph (no --More-- after wish granted)
        + CTRL_W + 'blessed potion of polymorph\n'
        + 'q'                  # quaff
        + 'o'                  # wish grants item 'o' (observed: "o - a fizzy potion")
        + SP                   # dismiss "You feel a little strange.--More--"
        + 'red dragon\n'       # wizard-mode: "Become what kind of monster?" — pick red dragon
        + SP * 2               # dismiss 2 --More-- prompts from red dragon transformation
        + extcmd('monster')    # polymorphed: "You don't have enough energy to breathe!"
    )
    out = os.path.join(SESSIONS_DIR, f'seed{seed}_extcmd_monster.session.json')
    _rs.run_session(seed, out, moves, raw_moves=True, wizard_mode=True, character=CHARACTER)
    print(f'  -> {out}')


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    os.makedirs(SESSIONS_DIR, exist_ok=True)

    run_all = '--all' in args
    if run_all or '--enhance' in args:
        capture_enhance()
    if run_all or '--chat' in args:
        capture_chat()
    if run_all or '--offer' in args:
        capture_offer()
    if run_all or '--monster' in args:
        capture_monster()


if __name__ == '__main__':
    main()
