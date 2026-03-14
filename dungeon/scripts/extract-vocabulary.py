#!/usr/bin/env python3
"""Extract vocabulary data and PARAMETER constants from dparam.for and parser.f.

Parses the Fortran include file (dparam.for) for all PARAMETER constants,
and parser.f for all vocabulary DATA statements (buzz words, prepositions,
directions, adjectives, objects, verbs, and their index arrays).

Outputs vocabulary data as JSON to be merged into dungeon-data.json.
"""

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DUNGEON_DIR = os.path.dirname(SCRIPT_DIR)
FORTRAN_DIR = os.path.join(DUNGEON_DIR, 'fortran-src')
JS_DIR = os.path.join(DUNGEON_DIR, 'js')

DPARAM_PATH = os.path.join(FORTRAN_DIR, 'dparam.for')
PARSER_PATH = os.path.join(FORTRAN_DIR, 'parser.f')
DATA_JSON_PATH = os.path.join(JS_DIR, 'dungeon-data.json')


def read_file(path):
    with open(path, 'r') as f:
        return f.read()


def join_continuation_lines(text):
    """Join Fortran continuation lines.

    Handles two formats:
    - Fixed-format: col 6 has a non-blank/non-zero continuation character
    - Tab-format: line starts with TAB + digit + TAB (used in parser.f)
    """
    lines = text.split('\n')
    result = []
    for line in lines:
        is_continuation = False
        rest = ''

        # Tab-format continuation: \t<digit>\t<rest> or \t<digit> <rest>
        m = re.match(r'^\t([1-9])[\t ](.*)', line)
        if m:
            is_continuation = True
            rest = m.group(2).strip()
        else:
            # Fixed-format continuation: col 6 is non-blank, non-zero
            if len(line) >= 6 and line[0] == ' ' and line[5] not in (' ', '0', '\t'):
                is_continuation = True
                rest = line[6:].strip()

        if is_continuation:
            if result:
                result[-1] += ' ' + rest
            else:
                result.append(rest)
        else:
            result.append(line)
    return '\n'.join(result)


def extract_parameters(text):
    """Extract all PARAMETER (NAME=VALUE, ...) constants from dparam.for."""
    params = {}
    # Join continuation lines first
    joined = join_continuation_lines(text)

    # Find all PARAMETER statements
    for match in re.finditer(r'PARAMETER\s*\(([^)]+)\)', joined, re.IGNORECASE):
        param_list = match.group(1)
        # Parse NAME=VALUE pairs
        for pair in re.finditer(r'(\w+)\s*=\s*(-?\d+)', param_list):
            name = pair.group(1).upper()
            value = int(pair.group(2))
            params[name] = value
    return params


def parse_octal(s):
    """Parse an octal literal like O'50147' to integer."""
    s = s.strip()
    m = re.match(r"O'(\d+)'", s)
    if m:
        return int(m.group(1), 8)
    return None


def parse_fortran_value(token):
    """Parse a Fortran DATA value token (integer, octal, or parameter reference)."""
    token = token.strip()
    if not token:
        return None

    # Octal literal: O'...'
    oval = parse_octal(token)
    if oval is not None:
        return oval

    # Integer literal (possibly negative)
    try:
        return int(token)
    except ValueError:
        pass

    # Could be a parameter name - return as string for later resolution
    return token


def resolve_value(val, params):
    """Resolve a value that might be a parameter name."""
    if isinstance(val, str):
        uval = val.upper()
        if uval in params:
            return params[uval]
        # Try without leading minus
        if uval.startswith('-') and uval[1:] in params:
            return -params[uval[1:]]
        raise ValueError(f"Unknown parameter reference: {val}")
    return val


def extract_data_statements(text, params):
    """Extract vocabulary DATA statements from parser.f."""
    joined = join_continuation_lines(text)

    def find_data_arrays(array_prefix, joined_text):
        """Find all DATA statements for a given array name pattern and collect values."""
        all_values = []
        # Match DATA (ARRAY(I),I=start,end) / ... / or DATA ARRAY / ... /
        pattern = rf"DATA\s+\(?{array_prefix}\s*\(I\)\s*,\s*I\s*=\s*(\d+)\s*,\s*(\d+)\)?\s*/([^/]+)/"
        for m in re.finditer(pattern, joined_text, re.IGNORECASE):
            start = int(m.group(1))
            end = int(m.group(2))
            values_str = m.group(3)
            values = parse_data_values(values_str, params)
            all_values.append((start, end, values))
        return all_values

    def find_simple_data(array_name, joined_text):
        """Find DATA ARRAY / val1, val2, ... / statements."""
        pattern = rf"DATA\s+{array_name}\s*/([^/]+)/"
        values = []
        for m in re.finditer(pattern, joined_text, re.IGNORECASE):
            values_str = m.group(1)
            values.extend(parse_data_values(values_str, params))
        return values

    def parse_data_values(values_str, params):
        """Parse a comma-separated list of Fortran DATA values, handling repeat counts."""
        values = []
        # Split on commas, but be careful with O'...' which shouldn't be split
        tokens = tokenize_data_values(values_str)
        for token in tokens:
            token = token.strip()
            if not token:
                continue
            # Check for repeat count: N*VALUE
            rm = re.match(r"(\d+)\*(.+)", token)
            if rm:
                count = int(rm.group(1))
                val = parse_and_resolve(rm.group(2).strip(), params)
                values.extend([val] * count)
            else:
                val = parse_and_resolve(token, params)
                values.append(val)
        return values

    def tokenize_data_values(s):
        """Split DATA values on commas, respecting O'...' octal literals."""
        tokens = []
        current = ''
        in_quote = False
        for ch in s:
            if ch == "'" and not in_quote:
                in_quote = True
                current += ch
            elif ch == "'" and in_quote:
                in_quote = False
                current += ch
            elif ch == ',' and not in_quote:
                tokens.append(current.strip())
                current = ''
            else:
                current += ch
        if current.strip():
            tokens.append(current.strip())
        return tokens

    def parse_and_resolve(token, params):
        """Parse a token and resolve parameter references."""
        val = parse_fortran_value(token)
        if val is None:
            raise ValueError(f"Cannot parse value: {token}")
        return resolve_value(val, params)

    # Extract string arrays (words)
    def find_string_data(array_prefix, joined_text):
        """Find all DATA statements for character arrays and collect string values."""
        all_values = []
        # Match DATA (ARRAY(I),I=start,end) / 'str1','str2',... /
        pattern = rf"DATA\s+\(?{array_prefix}\s*\(I\)\s*,\s*I\s*=\s*(\d+)\s*,\s*(\d+)\)?\s*/([^/]+)/"
        for m in re.finditer(pattern, joined_text, re.IGNORECASE):
            start = int(m.group(1))
            end = int(m.group(2))
            values_str = m.group(3)
            strings = parse_string_values(values_str)
            all_values.append((start, end, strings))
        return all_values

    def find_simple_string_data(array_name, joined_text):
        """Find DATA ARRAY / 'str1','str2',... / statements."""
        pattern = rf"DATA\s+{array_name}\s*/([^/]+)/"
        values = []
        for m in re.finditer(pattern, joined_text, re.IGNORECASE):
            values_str = m.group(1)
            values.extend(parse_string_values(values_str))
        return values

    def parse_string_values(s):
        """Parse comma-separated string values from a DATA statement."""
        values = []
        tokens = tokenize_string_values(s)
        for token in tokens:
            token = token.strip()
            if not token:
                continue
            # Check for repeat count: N*'VALUE' or N*VALUE
            rm = re.match(r"(\d+)\*(.+)", token)
            if rm:
                count = int(rm.group(1))
                val = rm.group(2).strip().strip("'")
                values.extend([val] * count)
            else:
                values.append(token.strip("'"))
        return values

    def tokenize_string_values(s):
        """Split string DATA values on commas, respecting quoted strings."""
        tokens = []
        current = ''
        in_quote = False
        for ch in s:
            if ch == "'" and not in_quote:
                in_quote = True
                current += ch
            elif ch == "'" and in_quote:
                in_quote = False
                current += ch
            elif ch == ',' and not in_quote:
                tokens.append(current.strip())
                current = ''
            else:
                current += ch
        if current.strip():
            tokens.append(current.strip())
        return tokens

    def collect_indexed_strings(data_list, max_size):
        """Assemble indexed string arrays from multiple DATA statements."""
        result = [''] * max_size
        for start, end, values in data_list:
            for i, val in enumerate(values):
                idx = start - 1 + i  # Convert 1-based to 0-based
                if idx < max_size:
                    result[idx] = val
        # Trim trailing empty/blank strings
        while result and (result[-1] == '' or result[-1].strip() == ''):
            result.pop()
        return result

    def collect_indexed_values(data_list, max_size):
        """Assemble indexed numeric arrays from multiple DATA statements."""
        result = [0] * max_size
        for start, end, values in data_list:
            for i, val in enumerate(values):
                idx = start - 1 + i  # Convert 1-based to 0-based
                if idx < max_size:
                    result[idx] = val
        # Trim trailing zeros
        while result and result[-1] == 0:
            result.pop()
        return result

    vocab = {}

    # --- Buzz words ---
    bword = find_simple_string_data('BWORD', joined)
    vocab['buzzwords'] = bword

    # --- Prepositions ---
    pword = find_simple_string_data('PWORD', joined)
    pvoc = find_simple_data('PVOC', joined)
    vocab['prepositions'] = {
        'words': pword,
        'indices': pvoc
    }

    # --- Directions ---
    dword = find_simple_string_data('DWORD', joined)
    dvoc = find_simple_data('DVOC', joined)
    vocab['directions'] = {
        'words': dword,
        'indices': dvoc
    }

    # --- Adjectives ---
    aword_data = find_string_data('AWORD', joined)
    avoc_data = find_data_arrays('AVOC', joined)
    aword = collect_indexed_strings(aword_data, params.get('AWMAX', 160))
    avoc = collect_indexed_values(avoc_data, params.get('AVMAX', 300))
    vocab['adjectives'] = {
        'words': aword,
        'indices': avoc
    }

    # --- Objects ---
    oword_data = find_string_data('OWORD', joined)
    ovoc_data = find_data_arrays('OVOC', joined)
    oword = collect_indexed_strings(oword_data, params.get('OWMAX', 360))
    ovoc = collect_indexed_values(ovoc_data, params.get('OVMAX', 550))
    vocab['objects'] = {
        'words': oword,
        'indices': ovoc
    }

    # --- Verbs ---
    vword_data = find_string_data('VWORD', joined)
    vvoc_data = find_data_arrays('VVOC', joined)
    vword = collect_indexed_strings(vword_data, params.get('VWMAX', 240))
    vvoc = collect_indexed_values(vvoc_data, params.get('VVMAX', 750))
    vocab['verbs'] = {
        'words': vword,
        'indices': vvoc
    }

    return vocab


def categorize_parameters(params):
    """Categorize parameters into logical groups for the JS constants file."""
    categories = {
        'dimensions': {},
        'syntax': {},
        'clock_events': {},
        'exits': {},
        'actors': {},
        'actor_flags': {},
        'room_flags': {},
        'rooms': {},
        'verb_indices': {},
        'object_flags': {},
        'object_indices': {},
        'misc': {},
    }

    dim_names = {'MMAX', 'RMAX', 'XXMAX', 'OMAX', 'R2MAX', 'CMAX', 'VMAX',
                 'AMAX', 'FMAX', 'SMAX', 'BWMAX', 'DWMAX', 'PWMAX', 'AWMAX',
                 'AVMAX', 'OWMAX', 'OVMAX', 'VWMAX', 'VVMAX',
                 'RECLNT', 'TEXLNT', 'WRDLNT', 'BUNMAX', 'LEXMAX'}

    syntax_names = {'SDIR', 'SIND', 'SSTD', 'SFLIP', 'SDRIV', 'SVMASK',
                    'VABIT', 'VRBIT', 'VTBIT', 'VCBIT', 'VEBIT', 'VFBIT', 'VPMASK'}

    clock_prefix = 'CEV'
    exit_names = {'XLFLAG', 'XDMASK', 'XRMASK', 'XFMASK', 'XFSHFT', 'XASHFT',
                  'XNORM', 'XNO', 'XCOND', 'XDOOR', 'XMIN', 'XMAX',
                  'XNORTH', 'XNE', 'XEAST', 'XSE', 'XSOUTH', 'XSW',
                  'XWEST', 'XNW', 'XUP', 'XDOWN', 'XLAUN', 'XLAND',
                  'XENTER', 'XEXIT', 'XCROSS'}

    actor_names = {'PLAYER', 'AROBOT', 'AMASTR'}
    actor_flag_names = {'ASTAG'}

    room_flag_names = {'RSEEN', 'RLIGHT', 'RLAND', 'RWATER', 'RAIR', 'RSACRD',
                       'RFILL', 'RMUNG', 'RBUCK', 'RHOUSE', 'RNWALL', 'REND'}

    obj_flag_names = {'VISIBT', 'READBT', 'TAKEBT', 'DOORBT', 'TRANBT', 'FOODBT',
                      'NDSCBT', 'DRNKBT', 'CONTBT', 'LITEBT', 'VICTBT', 'BURNBT',
                      'FLAMBT', 'TOOLBT', 'TURNBT', 'ONBT',
                      'FINDBT', 'DIGBT', 'SCRDBT', 'TIEBT', 'CLMBBT', 'ACTRBT',
                      'WEAPBT', 'FITEBT', 'VILLBT', 'STAGBT', 'TRYBT', 'NOCHBT',
                      'OPENBT', 'TCHBT', 'VEHBT', 'SCHBT'}

    # Room indices - known set from dparam.for
    room_names = {'WHOUS', 'SHOUS', 'EHOUS', 'KITCH', 'LROOM', 'CELLA', 'MTROL',
                  'MAZE1', 'MGRAT', 'MAZ15', 'FORE1', 'FORE2', 'FORE3', 'CLEAR',
                  'RESER', 'STREA', 'EGYPT', 'ECHOR', 'SLIDE', 'TSHAF', 'BSHAF',
                  'MMACH', 'DOME', 'MTORC', 'CAROU', 'RIDDL', 'LLD1', 'LLD2',
                  'TEMP1', 'TEMP2', 'MAINT', 'MCYCL', 'BLROO', 'TREAS',
                  'RIVR1', 'RIVR2', 'RIVR3', 'RIVR4', 'RIVR5', 'FCHMP',
                  'SBEACH', 'FALLS', 'MRAIN', 'POG', 'VLBOT', 'VAIR1', 'VAIR2',
                  'VAIR3', 'VAIR4', 'LEDG2', 'LEDG3', 'LEDG4', 'MSAFE', 'CAGER',
                  'CAGED', 'TWELL', 'BWELL', 'ALICE', 'ALISM', 'ALITR', 'MTREE',
                  'BKENT', 'BKVW', 'BKVE', 'BKTWI', 'BKVAU', 'BKBOX', 'CRYPT',
                  'TSTRS', 'MRANT', 'MREYE', 'MRA', 'MRB', 'MRC', 'MRG', 'MRD',
                  'FDOOR', 'MRAE', 'MRCE', 'MRCW', 'MRGE', 'MRGW', 'MRDW',
                  'INMIR', 'SCORR', 'NCORR', 'PARAP', 'CELL', 'PCELL', 'NCELL',
                  'CPANT', 'CPOUT', 'CPUZZ', 'PRM', 'PALRM', 'SLID1', 'SLEDG'}

    # Object indices
    obj_names = {'GARLI', 'FOOD', 'GUNK', 'COAL', 'MACHI', 'DIAMO', 'TCASE',
                 'BOTTL', 'WATER', 'ROPE', 'KNIFE', 'SWORD', 'LAMP', 'BLAMP',
                 'RUG', 'LEAVE', 'TROLL', 'AXE', 'KEYS', 'RKNIF', 'BAGCO', 'BAR',
                 'ICE', 'COFFI', 'TORCH', 'TBASK', 'FBASK', 'TIMBE', 'IRBOX',
                 'STRAD', 'GHOST', 'TRUNK', 'BELL', 'BOOK', 'CANDL', 'GUIDE',
                 'MATCH', 'MAILB', 'TUBE', 'PUTTY', 'WRENC', 'SCREW', 'CYCLO',
                 'CHALI', 'THIEF', 'STILL', 'WINDO', 'GRATE', 'DOOR', 'HPOLE',
                 'RBUTT', 'LEAK', 'RAILI', 'POT', 'STATU', 'IBOAT', 'DBOAT',
                 'PUMP', 'RBOAT', 'LABEL', 'STICK', 'BARRE', 'BUOY', 'SHOVE',
                 'GUANO', 'BALLO', 'RECEP', 'BROPE', 'HOOK1', 'HOOK2', 'ZORKM',
                 'SAFE', 'CARD', 'SSLOT', 'BRICK', 'FUSE', 'GNOME', 'BLABE',
                 'DBALL', 'TOMB', 'HEADS', 'COKES', 'LCASE', 'CAGE', 'RCAGE',
                 'SPHER', 'SQBUT', 'FLASK', 'POOL', 'SAFFR', 'BUCKE', 'ECAKE',
                 'ORICE', 'RDICE', 'BLICE', 'ROBOT', 'RBTLB', 'TTREE', 'FTREE',
                 'BILLS', 'PORTR', 'SCOL', 'ZGNOM', 'NEST', 'EGG', 'BEGG',
                 'BAUBL', 'CANAR', 'BCANA', 'YLWAL', 'RDWAL', 'PINDR', 'RBEAM',
                 'ODOOR', 'QDOOR', 'LDOOR', 'CDOOR', 'NUM1', 'NUM8', 'WARNI',
                 'CSLIT', 'GCARD', 'STLDR', 'HBELL', 'PLEAK', 'BROCH', 'STAMP',
                 'PDOOR', 'PLID1', 'PLID2', 'PKH1', 'PKH2', 'PKEY', 'PALAN',
                 'MAT', 'PAL3',
                 'ITOBJ', 'OPLAY', 'EVERY', 'VALUA', 'POSSE', 'SAILO', 'TEETH',
                 'WALL', 'HANDS', 'LUNGS', 'AVIAT', 'GBROCH', 'GWISH', 'GLOBAL',
                 'GRWAL', 'WNORT', 'GWATE', 'MASTER', 'BUNOBJ'}

    # Verb indices end in W (but exclude objects and other known sets)
    verb_suffix_names = {n for n in params if n.endswith('W') and n not in dim_names
                         and n not in syntax_names and n not in exit_names
                         and n not in obj_names and n not in room_names}

    for name, value in params.items():
        if name in dim_names:
            categories['dimensions'][name] = value
        elif name in syntax_names:
            categories['syntax'][name] = value
        elif name.startswith(clock_prefix):
            categories['clock_events'][name] = value
        elif name in exit_names:
            categories['exits'][name] = value
        elif name in actor_names:
            categories['actors'][name] = value
        elif name in actor_flag_names:
            categories['actor_flags'][name] = value
        elif name in room_flag_names:
            categories['room_flags'][name] = value
        elif name in room_names:
            categories['rooms'][name] = value
        elif name in verb_suffix_names:
            categories['verb_indices'][name] = value
        elif name in obj_flag_names:
            categories['object_flags'][name] = value
        elif name in obj_names:
            categories['object_indices'][name] = value
        else:
            categories['misc'][name] = value

    return categories


def main():
    # Read source files
    dparam_text = read_file(DPARAM_PATH)
    parser_text = read_file(PARSER_PATH)

    # Extract all PARAMETER constants
    params = extract_parameters(dparam_text)
    print(f"Extracted {len(params)} PARAMETER constants from dparam.for")

    # Extract vocabulary DATA statements
    vocab = extract_data_statements(parser_text, params)

    # Print summary
    print(f"Buzzwords: {len(vocab['buzzwords'])} words")
    print(f"Prepositions: {len(vocab['prepositions']['words'])} words, "
          f"{len(vocab['prepositions']['indices'])} indices")
    print(f"Directions: {len(vocab['directions']['words'])} words, "
          f"{len(vocab['directions']['indices'])} indices")
    print(f"Adjectives: {len(vocab['adjectives']['words'])} words, "
          f"{len(vocab['adjectives']['indices'])} indices")
    print(f"Objects: {len(vocab['objects']['words'])} words, "
          f"{len(vocab['objects']['indices'])} indices")
    print(f"Verbs: {len(vocab['verbs']['words'])} words, "
          f"{len(vocab['verbs']['indices'])} indices")

    # Load existing dungeon-data.json
    with open(DATA_JSON_PATH, 'r') as f:
        data = json.load(f)

    # Add vocabulary data
    data['vocabulary'] = vocab

    # Add categorized parameters
    data['parameters'] = categorize_parameters(params)

    # Write updated dungeon-data.json
    with open(DATA_JSON_PATH, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

    print(f"\nUpdated {DATA_JSON_PATH}")
    print(f"Parameter categories: {list(data['parameters'].keys())}")

    # Generate JS constants file
    generate_constants_js(data['parameters'])


def generate_constants_js(params_by_category):
    """Generate dungeon/js/constants.js with all PARAMETER constants as JS exports."""
    CONSTANTS_PATH = os.path.join(JS_DIR, 'constants.js')

    categories = [
        ('dimensions', 'Array size parameters'),
        ('syntax', 'Syntax definitions'),
        ('clock_events', 'Clock event indices'),
        ('exits', 'Exit definitions'),
        ('actors', 'Actor indices'),
        ('actor_flags', 'Actor flags'),
        ('room_flags', 'Room flags'),
        ('rooms', 'Room indices'),
        ('verb_indices', 'Verb indices'),
        ('object_flags', 'Object flags (flag word 1 and 2)'),
        ('object_indices', 'Object indices'),
        ('misc', 'Miscellaneous'),
    ]

    lines = [
        '// Constants extracted from dparam.for (Fortran Dungeon V4.0)',
        '// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS',
        '//',
        '// Auto-generated by extract-vocabulary.py - do not edit manually.',
        '',
    ]

    for cat_key, cat_label in categories:
        consts = params_by_category.get(cat_key, {})
        if not consts:
            continue
        lines.append(f'// {cat_label}')
        for name in sorted(consts, key=lambda n: consts[n]):
            lines.append(f'export const {name} = {consts[name]};')
        lines.append('')

    with open(CONSTANTS_PATH, 'w') as f:
        f.write('\n'.join(lines))

    print(f"Generated {CONSTANTS_PATH} ({sum(len(params_by_category[k]) for k in params_by_category)} constants)")


if __name__ == '__main__':
    main()
