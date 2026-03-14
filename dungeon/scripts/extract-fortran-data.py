#!/usr/bin/env python3
"""Extract game data from Fortran Dungeon's dindx + dtext files.

The Fortran version (V4.0) uses:
  - dindx: formatted text file with I8 integers and L4 logicals
  - dtext: direct-access binary file with 80-byte records
           (4-byte record linkage + 76-byte XOR-encrypted text)

Fortran READ(1,130) with FORMAT(I8) reads full arrays dimensioned at
their PARAMETER sizes (RMAX=200, XXMAX=1000, OMAX=300, etc.), not just
the actual count (RLNT, XLNT, OLNT).

This script parses both files and produces dungeon-data.json with all
game data needed for the JavaScript port.  Message texts are kept
XOR-encrypted (base64-encoded) to avoid spoiling the easter egg.
"""

import base64
import json
import os
import struct
import sys

RECLNT = 80   # record length in bytes
TEXLNT = 76   # text portion per record

# Array dimensions from dparam.for
RMAX = 200    # rooms
XXMAX = 1000  # exits
OMAX = 300    # objects
R2MAX = 20    # multiroom objects
CMAX = 30     # clock events
VMAX = 4      # villains
AMAX = 4      # actors
MMAX = 1500   # messages


def parse_dindx(path):
    """Parse the Fortran-formatted dindx file.

    Format: I8 integers (8-char fields), L4 logicals (4-char fields).
    Fortran READs fill full arrays at PARAMETER dimensions.
    """
    with open(path, 'r') as f:
        content = f.read()

    # Split all whitespace-separated tokens
    tokens = content.split()
    pos = [0]

    def next_int():
        val = int(tokens[pos[0]])
        pos[0] += 1
        return val

    def next_ints(n):
        return [next_int() for _ in range(n)]

    def next_logical():
        t = tokens[pos[0]]
        pos[0] += 1
        return t.upper().startswith('T')

    def next_logicals(n):
        return [next_logical() for _ in range(n)]

    data = {}

    # Version: READ(1,130) I,J  then READ(1,125) KEDIT
    data['vmaj'] = next_int()
    data['vmin'] = next_int()
    data['vedit'] = tokens[pos[0]]; pos[0] += 1  # character edit level

    # Scores: READ(1,130) MXSCOR,STRBIT,EGMXSC
    data['mxscor'] = next_int()
    data['strbit'] = next_int()
    data['egmxsc'] = next_int()

    # Rooms: READ(1,130) RLNT,RDESC2,RDESC1,REXIT,RACTIO,RVAL,RFLAG
    # Arrays are dimensioned at RMAX
    rlnt = next_int()
    rdesc2 = next_int()
    data['rooms'] = {
        'count': rlnt,
        'rdesc2': rdesc2,
        'rdesc1': next_ints(RMAX),
        'rexit': next_ints(RMAX),
        'ractio': next_ints(RMAX),
        'rval': next_ints(RMAX),
        'rflag': next_ints(RMAX),
    }

    # Exits: READ(1,130) XLNT,TRAVEL
    xlnt = next_int()
    data['exits'] = {
        'count': xlnt,
        'travel': next_ints(XXMAX),
    }

    # Objects: READ(1,130) OLNT,ODESC1,ODESC2,ODESCO,OACTIO,OFLAG1,OFLAG2,
    #          OFVAL,OTVAL,OSIZE,OCAPAC,OROOM,OADV,OCAN,OREAD
    olnt = next_int()
    data['objects'] = {
        'count': olnt,
        'odesc1': next_ints(OMAX),
        'odesc2': next_ints(OMAX),
        'odesco': next_ints(OMAX),
        'oactio': next_ints(OMAX),
        'oflag1': next_ints(OMAX),
        'oflag2': next_ints(OMAX),
        'ofval': next_ints(OMAX),
        'otval': next_ints(OMAX),
        'osize': next_ints(OMAX),
        'ocapac': next_ints(OMAX),
        'oroom': next_ints(OMAX),
        'oadv': next_ints(OMAX),
        'ocan': next_ints(OMAX),
        'oread': next_ints(OMAX),
    }

    # Room2: READ(1,130) R2LNT,O2,R2
    r2lnt = next_int()
    data['room2'] = {
        'count': r2lnt,
        'oroom2': next_ints(R2MAX),
        'rroom2': next_ints(R2MAX),
    }

    # Clock events: READ(1,130) CLNT,CTICK,CACTIO
    clnt = next_int()
    data['events'] = {
        'count': clnt,
        'ctick': next_ints(CMAX),
        'cactio': next_ints(CMAX),
    }
    # Logicals: READ(1,135) CFLAG,CCNCEL
    data['events']['cflag'] = next_logicals(CMAX)
    data['events']['ccncel'] = next_logicals(CMAX)

    # Villains: READ(1,130) VLNT,VILLNS,VPROB,VOPPS,VBEST,VMELEE
    vlnt = next_int()
    data['villains'] = {
        'count': vlnt,
        'villns': next_ints(VMAX),
        'vprob': next_ints(VMAX),
        'vopps': next_ints(VMAX),
        'vbest': next_ints(VMAX),
        'vmelee': next_ints(VMAX),
    }

    # Adventurers: READ(1,130) ALNT,AROOM,ASCORE,AVEHIC,AOBJ,AACTIO,ASTREN,AFLAG
    alnt = next_int()
    data['adventurers'] = {
        'count': alnt,
        'aroom': next_ints(AMAX),
        'ascore': next_ints(AMAX),
        'avehic': next_ints(AMAX),
        'aobj': next_ints(AMAX),
        'aactio': next_ints(AMAX),
        'astren': next_ints(AMAX),
        'aflag': next_ints(AMAX),
    }

    # Messages: READ(1,130) MBASE,MLNT,RTEXT
    mbase = next_int()
    mlnt = next_int()
    data['messages'] = {
        'mbase': mbase,
        'count': mlnt,
        'rtext': next_ints(MMAX),
    }

    print(f"Version: {data['vmaj']}.{data['vmin']}{data['vedit']}")
    print(f"Max score: {data['mxscor']}, End game max: {data['egmxsc']}")
    print(f"Rooms: {rlnt} (array dim {RMAX})")
    print(f"Exits: {xlnt} (array dim {XXMAX})")
    print(f"Objects: {olnt} (array dim {OMAX})")
    print(f"Room2: {r2lnt} (array dim {R2MAX})")
    print(f"Events: {clnt} (array dim {CMAX})")
    print(f"Villains: {vlnt} (array dim {VMAX})")
    print(f"Adventurers: {alnt} (array dim {AMAX})")
    print(f"Messages: {mlnt} (array dim {MMAX}), melee base: {mbase}")
    print(f"Tokens consumed: {pos[0]} of {len(tokens)}")

    return data


def read_raw_record(data, recnum):
    """Read record recnum (1-based) from dtext binary data.
    Returns (linkage, raw_encrypted_bytes) or (None, None)."""
    offset = (recnum - 1) * RECLNT
    if offset + RECLNT > len(data):
        return None, None
    record = data[offset:offset + RECLNT]
    # First 4 bytes: record linkage number (big-endian Fortran integer*4)
    linkage = struct.unpack('>i', record[:4])[0]
    raw_text = record[4:4 + TEXLNT]
    return linkage, raw_text


def decrypt_record(recnum, raw_text):
    """Decrypt a 76-byte text record using Fortran TXCRYP algorithm.

    X = IAND(R, 31) + I;  LINE(I) = IEOR(LINE(I), X)
    R = record number (1-based), I = 1-based position.
    """
    result = []
    for i in range(len(raw_text)):
        x = (recnum & 31) + (i + 1)
        ch = raw_text[i] ^ x
        result.append(ch)
    return bytes(result)


def extract_messages(dtext_path, rtext_array, keep_encrypted=False):
    """Extract all messages from the dtext binary file.

    If keep_encrypted=True, returns raw encrypted bytes (base64-encoded)
    instead of decrypted text strings.
    """
    with open(dtext_path, 'rb') as f:
        data = f.read()

    total_records = len(data) // RECLNT
    print(f"Text file: {len(data)} bytes, {total_records} records")

    messages = {}
    for idx, rtext_val in enumerate(rtext_array):
        if rtext_val == 0:
            continue

        msg_num = idx + 1  # 1-based
        recnum = abs(rtext_val)

        records = []
        linkage, raw_text = read_raw_record(data, recnum)
        if raw_text is None:
            continue

        old_linkage = linkage
        records.append((recnum, raw_text))

        # Read continuation records
        while True:
            recnum += 1
            new_linkage, raw_text = read_raw_record(data, recnum)
            if raw_text is None or new_linkage != old_linkage:
                break
            records.append((recnum, raw_text))

        if keep_encrypted:
            # Store as array of {recnum, data_base64} for JS decryption
            msg_records = []
            for rec_num, raw in records:
                msg_records.append({
                    'r': rec_num,
                    'd': base64.b64encode(raw).decode('ascii'),
                })
            messages[msg_num] = msg_records
        else:
            # Decrypt and join
            lines = []
            for rec_num, raw in records:
                decrypted = decrypt_record(rec_num, raw)
                text_str = decrypted.rstrip(b'\x00').rstrip(b' ').decode('ascii', errors='replace')
                lines.append(text_str)
            messages[msg_num] = '\n'.join(lines)

    return messages


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fortran_dir = os.path.join(script_dir, '..', 'fortran-src')
    dindx_path = os.path.join(fortran_dir, 'dindx')
    dtext_path = os.path.join(fortran_dir, 'dtext')
    out_path = os.path.join(script_dir, '..', 'js', 'dungeon-data.json')

    for path in [dindx_path, dtext_path]:
        if not os.path.exists(path):
            print(f"Error: {path} not found", file=sys.stderr)
            sys.exit(1)

    print("=== Parsing dindx ===")
    data = parse_dindx(dindx_path)

    print("\n=== Extracting messages from dtext ===")
    # Keep messages encrypted — JS runtime will decrypt on demand
    encrypted_msgs = extract_messages(dtext_path, data['messages']['rtext'],
                                      keep_encrypted=True)
    data['messages']['texts'] = {str(k): v for k, v in encrypted_msgs.items()}
    print(f"Extracted {len(encrypted_msgs)} encrypted messages")

    # Also decrypt a few for validation
    print("\n--- Decrypted samples (for validation only) ---")
    decrypted_msgs = extract_messages(dtext_path, data['messages']['rtext'],
                                      keep_encrypted=False)
    for n in [1, 2, 3, 4, 5]:
        if n in decrypted_msgs:
            text = decrypted_msgs[n].replace('\n', ' / ')
            if len(text) > 100:
                text = text[:100] + '...'
            print(f"  [{n}] {text}")

    # Write output
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nWrote {out_path}")
    print(f"Total encrypted messages: {len(encrypted_msgs)}")


if __name__ == '__main__':
    main()
