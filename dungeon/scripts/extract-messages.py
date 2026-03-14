#!/usr/bin/env python3
"""Extract all encrypted message texts from Dungeon's dtextc.dat file.

The C version of Dungeon stores game text in a binary data file (dtextc.dat).
The file has two sections:
  1. An index section (room/object/exit arrays) read by dinit.c at startup
  2. A text section with XOR-encrypted message strings

The encryption key is "IanLanceTaylorJr" (from dsub.c).
Each message is located via rtext[], which stores negative offsets.
The actual file position is: ((-rtext[n]) - 1) * 8 + mrloc
where mrloc is the byte offset where the text section begins.

This script reads the binary data, replays the init sequence to find
mrloc and rtext[], then decrypts all messages to produce a JSON file.
"""

import struct
import json
import sys
import os

ZKEY = b"IanLanceTaylorJr"

def read_int16(f):
    """Read a big-endian signed 16-bit integer (matching C's rdint macro)."""
    hi = f.read(1)
    lo = f.read(1)
    if len(hi) == 0 or len(lo) == 0:
        raise EOFError("Unexpected end of file")
    h = hi[0]
    if h > 127:
        h -= 256
    return h * 256 + lo[0]

def read_ints(f, count):
    """Read count 16-bit integers."""
    return [read_int16(f) for _ in range(count)]

def read_partial_ints(f, count):
    """Read index,value pairs until sentinel. Returns dict of index->value."""
    result = {}
    while True:
        if count < 255:
            i = f.read(1)[0]
            if i == 255:
                return result
        else:
            i = read_int16(f)
            if i == -1:
                return result
        val = read_int16(f)
        result[i] = val
    return result

def read_flags(f, count):
    """Read count 1-byte flags."""
    return [f.read(1)[0] for _ in range(count)]

def decrypt_message(f, offset, mrloc):
    """Decrypt a message starting at the given rtext offset."""
    x = ((-offset) - 1) * 8
    f.seek(x + mrloc)
    chars = []
    pos = x
    while True:
        byte = f.read(1)
        if len(byte) == 0:
            break
        i = byte[0] ^ ZKEY[pos & 0xf] ^ (pos & 0xff)
        pos += 1
        if i == 0:
            break
        elif i == ord('\n'):
            chars.append('\n')
        elif i == ord('#'):
            chars.append('#')  # substitution marker
        else:
            chars.append(chr(i))
    return ''.join(chars)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dat_path = os.path.join(script_dir, '..', 'c-src', 'dtextc.dat')
    out_path = os.path.join(script_dir, '..', 'js', 'dungeon-data.json')

    if not os.path.exists(dat_path):
        print(f"Error: {dat_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(dat_path, 'rb') as f:
        # Read version header
        vmaj = read_int16(f)
        vmin = read_int16(f)
        vedit = read_int16(f)
        print(f"Database version: {vmaj}.{vmin}{chr(vedit)}")

        mxscor = read_int16(f)
        strbit = read_int16(f)
        egmxsc = read_int16(f)
        print(f"Max score: {mxscor}, End game max: {egmxsc}")

        # Rooms
        rlnt = read_int16(f)
        print(f"Rooms: {rlnt}")
        rdesc1 = read_ints(f, rlnt)
        rdesc2 = read_ints(f, rlnt)
        rexit = read_ints(f, rlnt)
        ractio = read_partial_ints(f, rlnt)
        rval = read_partial_ints(f, rlnt)
        rflag = read_ints(f, rlnt)

        # Exits
        xlnt = read_int16(f)
        print(f"Exits: {xlnt}")
        travel = read_ints(f, xlnt)

        # Objects
        olnt = read_int16(f)
        print(f"Objects: {olnt}")
        odesc1 = read_ints(f, olnt)
        odesc2 = read_ints(f, olnt)
        odesco = read_partial_ints(f, olnt)
        oactio = read_partial_ints(f, olnt)
        oflag1 = read_ints(f, olnt)
        oflag2 = read_partial_ints(f, olnt)
        ofval = read_partial_ints(f, olnt)
        otval = read_partial_ints(f, olnt)
        osize = read_ints(f, olnt)
        ocapac = read_partial_ints(f, olnt)
        oroom = read_ints(f, olnt)
        oadv = read_partial_ints(f, olnt)
        ocan = read_partial_ints(f, olnt)
        oread = read_partial_ints(f, olnt)

        # Room2 (multi-location objects)
        r2lnt = read_int16(f)
        print(f"Room2 entries: {r2lnt}")
        oroom2 = read_ints(f, r2lnt)
        rroom2 = read_ints(f, r2lnt)

        # Clock events
        clnt = read_int16(f)
        print(f"Clock events: {clnt}")
        ctick = read_ints(f, clnt)
        cactio = read_ints(f, clnt)
        cflag = read_flags(f, clnt)

        # Villains
        vlnt = read_int16(f)
        print(f"Villains: {vlnt}")
        villns = read_ints(f, vlnt)
        vprob = read_partial_ints(f, vlnt)
        vopps = read_partial_ints(f, vlnt)
        vbest = read_ints(f, vlnt)
        vmelee = read_ints(f, vlnt)

        # Adventurers
        alnt = read_int16(f)
        print(f"Adventurers: {alnt}")
        aroom = read_ints(f, alnt)
        ascore = read_partial_ints(f, alnt)
        avehic = read_partial_ints(f, alnt)
        aobj = read_ints(f, alnt)
        aactio = read_ints(f, alnt)
        astren = read_ints(f, alnt)
        aflag = read_partial_ints(f, alnt)

        # Messages
        mbase = read_int16(f)
        mlnt = read_int16(f)
        print(f"Messages: {mlnt}, melee base: {mbase}")
        rtext = read_ints(f, mlnt)

        # Record start of text section
        mrloc = f.tell()
        print(f"Text section starts at byte: {mrloc}")

        # Decrypt all messages
        messages = {}
        for i in range(mlnt):
            offset = rtext[i]
            if offset == 0:
                continue
            try:
                text = decrypt_message(f, offset, mrloc)
                messages[i + 1] = text  # 1-indexed
            except Exception as e:
                print(f"  Warning: failed to decrypt message {i+1}: {e}", file=sys.stderr)

        print(f"Decrypted {len(messages)} messages")

    # Build output data
    data = {
        "version": f"{vmaj}.{vmin}{chr(vedit)}",
        "mxscor": mxscor,
        "strbit": strbit,
        "egmxsc": egmxsc,
        "rooms": {
            "count": rlnt,
            "rdesc1": rdesc1,
            "rdesc2": rdesc2,
            "rexit": rexit,
            "ractio": {int(k): v for k, v in ractio.items()},
            "rval": {int(k): v for k, v in rval.items()},
            "rflag": rflag,
        },
        "exits": {
            "count": xlnt,
            "travel": travel,
        },
        "objects": {
            "count": olnt,
            "odesc1": odesc1,
            "odesc2": odesc2,
            "odesco": {int(k): v for k, v in odesco.items()},
            "oactio": {int(k): v for k, v in oactio.items()},
            "oflag1": oflag1,
            "oflag2": {int(k): v for k, v in oflag2.items()},
            "ofval": {int(k): v for k, v in ofval.items()},
            "otval": {int(k): v for k, v in otval.items()},
            "osize": osize,
            "ocapac": {int(k): v for k, v in ocapac.items()},
            "oroom": oroom,
            "oadv": {int(k): v for k, v in oadv.items()},
            "ocan": {int(k): v for k, v in ocan.items()},
            "oread": {int(k): v for k, v in oread.items()},
        },
        "room2": {
            "count": r2lnt,
            "oroom2": oroom2,
            "rroom2": rroom2,
        },
        "events": {
            "count": clnt,
            "ctick": ctick,
            "cactio": cactio,
            "cflag": cflag,
        },
        "villains": {
            "count": vlnt,
            "villns": villns,
            "vprob": {int(k): v for k, v in vprob.items()},
            "vopps": {int(k): v for k, v in vopps.items()},
            "vbest": vbest,
            "vmelee": vmelee,
        },
        "adventurers": {
            "count": alnt,
            "aroom": aroom,
            "ascore": {int(k): v for k, v in ascore.items()},
            "avehic": {int(k): v for k, v in avehic.items()},
            "aobj": aobj,
            "aactio": aactio,
            "astren": astren,
            "aflag": {int(k): v for k, v in aflag.items()},
        },
        "messages": {
            "count": mlnt,
            "mbase": mbase,
            "rtext": rtext,
            "texts": messages,
        },
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nWrote {out_path}")

    # Print some sample messages
    print("\n--- Sample messages ---")
    for n in [1, 2, 3, 4, 5]:
        if n in messages:
            text = messages[n].replace('\n', ' / ')
            print(f"  [{n}] {text[:80]}...")

if __name__ == '__main__':
    main()
