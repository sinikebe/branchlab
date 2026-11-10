#!/usr/bin/env python3
"""Extract identified EDID data from CORSAIR's v110 firmware; execute nothing.

Usage: python3 scripts/extract-xeneon-edid.py /path/to/firmware.zip --output-dir /tmp/xeneon-edid
See docs/sources/xeneon-flex-firmware.md for provenance and interpretation limits.
"""

import argparse
import hashlib
import json
from pathlib import Path
import zipfile


ARCHIVE_SHA256 = "ca55c853747ba9618dea2baf6582983841745467be67d0c5d5a889efd5721f12"
SCALER_PATH = "Scaler/ISPTool/CORSAIR_XENEON_45WQHD240_V110_20231123_DED4_Reduce.bin"
SCALER_SHA256 = "40c843330a8ee972352e3f665ca96e2a40ac22ad214ce288c3ac7213bd8038af"
INSTALLER_SHA256 = "8f8e9f8d0ac3dfbc0351df7653fdace2e061a9864558d35b2730a989ea659176"
EDID_HEADER = bytes.fromhex("00ffffffffffff00")
EXPECTED_OFFSETS = (0x850C1, 0x85241, 0x85341, 0x854C1, 0x855C1, 0x85741, 0x85841, 0x859C1)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify_hash(data, expected, label):
    actual = sha256(data)
    if actual != expected:
        raise ValueError(f"{label}: SHA-256 mismatch ({actual}); do not reuse this interpretation for another firmware")


def displayid_type_i_timings(edid):
    """Decode only DisplayID 1.x type-I timing data, as used in this firmware."""
    timings = []
    for base in range(128, len(edid), 128):
        block = edid[base:base + 128]
        if block[0] != 0x70:
            continue
        offset, end = 5, 5 + block[2]
        while offset + 3 <= end:
            tag, _, size = block[offset:offset + 3]
            payload = block[offset + 3:offset + 3 + size]
            if tag == 0x03:
                if size % 20:
                    raise ValueError("Unexpected DisplayID type-I timing size")
                for start in range(0, size, 20):
                    t = payload[start:start + 20]
                    clock_khz = (int.from_bytes(t[:3], "little") + 1) * 10
                    width = int.from_bytes(t[4:6], "little") + 1
                    hblank = int.from_bytes(t[6:8], "little") + 1
                    height = int.from_bytes(t[12:14], "little") + 1
                    vblank = int.from_bytes(t[14:16], "little") + 1
                    hfront = (int.from_bytes(t[8:10], "little") & 0x7FFF) + 1
                    hsync = int.from_bytes(t[10:12], "little") + 1
                    vfront = (int.from_bytes(t[16:18], "little") & 0x7FFF) + 1
                    vsync = int.from_bytes(t[18:20], "little") + 1
                    timings.append({
                        "width": width, "height": height,
                        "pixelClockMHz": clock_khz / 1000,
                        "horizontalTotal": width + hblank,
                        "verticalTotal": height + vblank,
                        "refreshHz": clock_khz * 1000 / ((width + hblank) * (height + vblank)),
                        "horizontalFrontPorch": hfront, "horizontalSync": hsync,
                        "horizontalBackPorch": hblank - hfront - hsync,
                        "verticalFrontPorch": vfront, "verticalSync": vsync,
                        "verticalBackPorch": vblank - vfront - vsync,
                    })
            offset += 3 + size
    return timings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    archive_bytes = args.archive.read_bytes()
    verify_hash(archive_bytes, ARCHIVE_SHA256, "Archive")
    with zipfile.ZipFile(args.archive) as archive:
        scaler = archive.read(SCALER_PATH)
        verify_hash(scaler, SCALER_SHA256, "Scaler image")
        verify_hash(archive.read("RTFirmwareInstaller.exe"), INSTALLER_SHA256, "Installer")

    # Do not extract/run executable files, and do not trust ZIP member paths as destinations.
    found, offset = [], 0
    while True:
        offset = scaler.find(EDID_HEADER, offset)
        if offset < 0:
            break
        if scaler[offset + 8:offset + 12] == bytes.fromhex("0e4d1f1b"):
            length = 128 * (1 + scaler[offset + 126])
            edid = scaler[offset:offset + length]
            if len(edid) != length or any(sum(edid[i:i + 128]) % 256 for i in range(0, length, 128)):
                raise ValueError(f"Invalid EDID checksum or length at {offset:#x}")
            found.append((offset, edid))
        offset += len(EDID_HEADER)
    if tuple(offset for offset, _ in found) != EXPECTED_OFFSETS:
        raise ValueError("Unexpected EDID offsets")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    result = {"archiveSha256": ARCHIVE_SHA256, "scalerSha256": SCALER_SHA256, "profiles": []}
    for offset, edid in found:
        filename = f"45wqhd240-v110-{offset:05x}.bin"
        destination = args.output_dir / filename
        if destination.exists() and destination.read_bytes() != edid:
            raise ValueError(f"Refusing to replace different existing file: {destination}")
        destination.write_bytes(edid)
        profile = {
            "offset": f"0x{offset:x}", "file": filename, "bytes": len(edid),
            "sha256": sha256(edid), "allBlockChecksumsValid": True,
            "edidVersion": f"{edid[18]}.{edid[19]}",
            "displayIdTimings": displayid_type_i_timings(edid),
        }
        if edid[18:20] == bytes([1, 4]) and edid[20] & 0x80:
            profile["digitalInterfaceCode"] = edid[20] & 0x0F
            profile["colorDepthCode"] = (edid[20] >> 4) & 0x07
        result["profiles"].append(profile)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
