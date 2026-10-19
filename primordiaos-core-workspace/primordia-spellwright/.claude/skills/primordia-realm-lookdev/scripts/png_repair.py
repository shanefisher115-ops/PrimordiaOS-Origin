"""Turns a truncated PNG into a valid one by padding the missing rows (black).

    python png_repair.py <truncated.png> <out.png>

Pure standard library: decompresses whatever image data arrived, keeps every complete scanline as-is
(filter bytes included, so no per-pixel work), pads the rest with blank rows, and rewrites the file.
Prints how many rows survived.
"""
import struct
import sys
import zlib


def chunk(kind, body):
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    d = open(src, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit("not a PNG")
    pos, idat, ihdr = 8, bytearray(), None
    while pos + 8 <= len(d):
        length, kind = struct.unpack(">I4s", d[pos:pos + 8])
        body = d[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            ihdr = body
        elif kind == b"IDAT":
            idat += body
        pos += 12 + length
    w, h, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", ihdr)
    if interlace:
        raise SystemExit("interlaced PNGs aren't supported")
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    row = 1 + (w * channels * depth + 7) // 8
    raw = zlib.decompressobj().decompress(bytes(idat))
    have = min(len(raw) // row, h)
    raw = raw[:have * row] + bytes(row) * (h - have)
    open(dst, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 6))
                          + chunk(b"IEND", b""))
    print(f"{w}x{h}: kept {have} of {h} rows, padded {h - have}")


if __name__ == "__main__":
    main()
