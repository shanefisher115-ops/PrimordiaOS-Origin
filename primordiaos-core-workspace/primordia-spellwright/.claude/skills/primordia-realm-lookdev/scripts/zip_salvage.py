"""Pulls every complete file out of a truncated zip (an interrupted download).

    python zip_salvage.py <archive.zip> <out-dir> [--list]

Zip entries are stored one after another, each with a local header carrying its size and CRC, so the
files that finished downloading are intact even though the central directory at the end is missing.
Complete entries are CRC-checked and extracted; the entry that was cut off is written as <name>.partial
(useful for images: see png_repair.py). Nothing is written with --list.
"""
import os
import struct
import sys
import zlib


def main():
    src, out = sys.argv[1], sys.argv[2]
    listing = "--list" in sys.argv
    data = open(src, "rb").read()
    n, pos = len(data), 0
    while True:
        pos = data.find(b"PK\x03\x04", pos)
        if pos < 0 or pos + 30 > n:
            break
        _, _, flag, method, _, _, crc, csize, usize, fnlen, exlen = struct.unpack("<IHHHHHIIIHH", data[pos:pos + 30])
        name = data[pos + 30:pos + 30 + fnlen].decode("utf-8", "replace")
        start = pos + 30 + fnlen + exlen
        end = start + csize
        complete = end <= n and not flag & 8
        blob = data[start:min(end, n)]
        status = "complete" if complete else f"cut off at {len(blob) / max(csize, 1):.1%}"
        if complete:
            raw = blob if method == 0 else zlib.decompress(blob, -15) if method == 8 else None
            if raw is None:
                status = f"complete, unsupported method {method}"
            elif zlib.crc32(raw) & 0xFFFFFFFF != crc:
                status = "complete but CRC MISMATCH"
                raw = None
        print(f"{usize / 1048576:8.1f} MB  {status:28} {name}")
        if not listing and not name.endswith("/"):
            dst = os.path.join(out, name.replace("/", os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if complete and raw is not None:
                open(dst, "wb").write(raw)
            elif not complete and method == 0:
                open(dst + ".partial", "wb").write(blob)
        if not complete:
            break
        pos = end


if __name__ == "__main__":
    main()
