"""Rebuild a resume journal from the staged tree, proving each replaced shard.

``write_shard`` publishes a replacement with an atomic rename, so a target shard
whose inode differs from the parent is always a complete file.  This script
nevertheless re-reads every such shard and confirms that all planned row updates
are present with their corrected values, so nothing is trusted on inference
alone.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/manal/UrbanTransit-IQ")

from data_generator.bounded_remediation import _fields, _scan, rebuild_row  # noqa: E402

SOURCE = Path("/home/manal/Desktop/UrbanTransit-IQ/raw_data/production-v1")
TARGET = Path("/home/manal/Desktop/UrbanTransit-IQ/raw_data/production-v1.1")
PLAN = json.loads(Path("/home/manal/UrbanTransit-IQ/.remediation_work/plan_v11.json").read_text())
JOURNAL = Path("/home/manal/UrbanTransit-IQ/.remediation_work/materialize_journal.txt")

ENTRY_INDEX = {name: i for i, name in enumerate(_fields("__probe__"))} if False else None

done: list[str] = []
pending: list[str] = []
unverified: list[str] = []

for entry in PLAN["closure"]:
    origin = SOURCE / entry["path"]
    mirror = TARGET / entry["path"]
    if not mirror.exists():
        pending.append(entry["path"])
        continue
    if origin.stat().st_ino == mirror.stat().st_ino:
        pending.append(entry["path"])
        continue
    # Replaced: verify every planned update is present in the staged shard.
    table = entry["table"]
    fields = _fields(table)
    wanted = dict(PLAN["updates_by_shard"][table][entry["shard"]])
    seen = 0
    bad: list[str] = []
    for row in _scan(mirror, ("source_row_id",)):
        pass
    # full read: parse only the columns needed for the comparison
    import csv
    with mirror.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        sid_at = header.index("source_row_id")
        for row in reader:
            change = wanted.get(row[sid_at])
            if change is None:
                continue
            seen += 1
            for column, value in change.items():
                if row[header.index(column)] != value:
                    bad.append(f"{row[sid_at][:12]}.{column}")
    if seen == len(wanted) and not bad:
        done.append(entry["path"])
    else:
        unverified.append(f"{entry['path']}: applied {seen}/{len(wanted)} bad={bad[:3]}")

JOURNAL.write_text("".join(line + "\n" for line in done))
print(json.dumps({
    "closure": len(PLAN["closure"]),
    "verified_replaced": len(done),
    "still_pending": len(pending),
    "unverified": unverified,
    "journal": str(JOURNAL),
}, indent=2))
if unverified:
    raise SystemExit("refusing to journal unverified shards")
