#!/usr/bin/env python3
"""Renders scanner artifacts into one pull request comment.

Absent-by-default: a scanner that did not run reports as "not run", never as
a pass. Runs write-scoped, so it reads only the downloaded artifacts.
"""

import json
import sys
from pathlib import Path

MARKER_GATE = "**gates**"
MARKER_INFO = "reports"


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def gitleaks_row(root: Path) -> tuple[str, str, str]:
    p = next(root.glob("**/gitleaks-report.json"), None)
    if p is None:
        return ("CI-SEC-01 secret scan", "not run", "artifact missing")
    data = load(p)
    if data is None:
        return ("CI-SEC-01 secret scan", "not run", "report unreadable")
    n = len(data) if isinstance(data, list) else 0
    if n:
        # Values are redacted at source; never print a secret here.
        return ("CI-SEC-01 secret scan", f"**{n} FINDING(S)**", "build failed, rotate then purge")
    return ("CI-SEC-01 secret scan", "clean", "full history scanned")


def semgrep_row(root: Path) -> tuple[str, str, str]:
    p = next(root.glob("**/semgrep-report.json"), None)
    if p is None:
        return ("CI-SEC-02 semgrep", "not run", "no source files yet")
    data = load(p) or {}
    results = data.get("results", [])
    scanned = len(data.get("paths", {}).get("scanned", []))
    if not scanned:
        return ("CI-SEC-02 semgrep", "not run", "0 files matched")
    return ("CI-SEC-02 semgrep", f"{len(results)} finding(s)", f"{scanned} files")


def ruff_row(root: Path) -> tuple[str, str, str]:
    p = next(root.glob("**/ruff-security.json"), None)
    if p is None:
        return ("CI-SEC-03 ruff S", "not run", "no Python files yet")
    data = load(p) or []
    return ("CI-SEC-03 ruff S", f"{len(data)} finding(s)", "S ruleset")


def eslint_row(root: Path) -> tuple[str, str, str]:
    p = next(root.glob("**/eslint-security.json"), None)
    if p is None:
        return ("CI-SEC-04 eslint security", "not run", "no frontend yet")
    data = load(p) or []
    total = sum(len(f.get("messages", [])) for f in data) if isinstance(data, list) else 0
    return ("CI-SEC-04 eslint security", f"{total} finding(s)", "security plugin")


def audit_row(root: Path) -> tuple[str, str, str]:
    found = list(root.glob("**/pip-audit.json")) + list(root.glob("**/pnpm-audit.json"))
    if not found:
        return ("CI-SEC-05 dependency audit", "not run", "no manifests yet")
    return ("CI-SEC-05 dependency audit", f"{len(found)} report(s)", "see artifacts")


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "reports")

    rows = [
        gitleaks_row(root),
        semgrep_row(root),
        ruff_row(root),
        eslint_row(root),
        audit_row(root),
    ]

    lines = [
        "## Security scan",
        "",
        "| Rule | Result | Notes |",
        "|---|---|---|",
    ]
    lines += [f"| {name} | {result} | {note} |" for name, result, note in rows]
    lines += [
        "",
        f"CI-SEC-01 {MARKER_GATE}: a finding fails the build. "
        f"CI-SEC-02 to CI-SEC-05 {MARKER_INFO} only.",
        "",
        "`not run` means the scanner had nothing to scan or its artifact is "
        "missing. It is **not** a pass.",
        "",
        "Raw reports are attached as workflow artifacts (30 day retention).",
    ]

    body = "\n".join(lines) + "\n"
    Path("security-report.md").write_text(body, encoding="utf-8")
    print(body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
