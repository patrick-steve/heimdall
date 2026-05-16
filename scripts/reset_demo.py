"""Wipe runtime state (DB + audit logs) and re-seed baselines.

Usage:
    python -m scripts.reset_demo
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.db import init_db  # noqa: E402
from scripts.seed_db import main as seed_main  # noqa: E402


def main() -> None:
    db_path = ROOT / "heimdall.db"
    if db_path.exists():
        db_path.unlink()
        print(f"[reset] deleted {db_path}")
    audit_dir = ROOT / "audit_logs"
    if audit_dir.exists():
        for f in audit_dir.iterdir():
            f.unlink()
        print(f"[reset] cleared {audit_dir}")
    init_db()
    print("[reset] db re-initialised")
    seed_main()


if __name__ == "__main__":
    main()
