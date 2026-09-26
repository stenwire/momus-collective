#!/usr/bin/env python3
"""Fails when CI jobs and verify-checklist CI-SEC rows stop naming the same IDs.

Asserts ID linkage only: comparing shell command text is not meaningfully
achievable, and a check that pretends to is worse than none.
"""

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/security.yml"
CHECKLIST = ROOT / ".claude/skills/verify/references/checklist.md"

ID = re.compile(r"CI-SEC-\d{2}")


def ids_in_job_names(path: Path) -> set[str]:
    """IDs cited by a real job's name, ignoring comments.

    Parsed, not grepped: the header comment names every rule, so a whole-file
    grep still matched CI-SEC-05 after that job was deleted (D-019).
    """
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    names = [job.get("name", "") for job in (data.get("jobs") or {}).values()]
    return {rule for name in names for rule in ID.findall(str(name))}


def main() -> int:
    missing = [p for p in (WORKFLOW, CHECKLIST) if not p.exists()]
    if missing:
        for p in missing:
            print(f"error: {p.relative_to(ROOT)} not found", file=sys.stderr)
        return 1

    in_ci = ids_in_job_names(WORKFLOW)
    in_checklist = set(ID.findall(CHECKLIST.read_text(encoding="utf-8")))

    orphan_ci = sorted(in_ci - in_checklist)
    orphan_doc = sorted(in_checklist - in_ci)

    for rule in orphan_ci:
        print(
            f"error: {rule} runs in CI but has no checklist row. "
            f"/verify cannot report on it.",
            file=sys.stderr,
        )
    for rule in orphan_doc:
        print(
            f"error: {rule} is in the checklist but no CI job cites it. "
            f"The checklist claims coverage that does not exist.",
            file=sys.stderr,
        )

    if orphan_ci or orphan_doc:
        return 1

    print(f"ok: {len(in_ci)} CI-SEC rules linked in both files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
