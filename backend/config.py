"""Centralised env loading with sensible dev fallbacks.

- HEIMDALL_SECRET defaults to a stable dev secret (NEVER use in prod).
- GEMINI_API_KEY falls back to reading ./GEMINI_KEY.txt at repo root.
- LOBSTER_TRAP_URL, SEPOLIA_* may be empty: the relevant subsystems
  detect this and switch into mock mode.
"""
from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / ".env")


def _read_key_file() -> str:
    f = REPO_ROOT / "GEMINI_KEY.txt"
    if f.exists():
        return f.read_text(encoding="utf-8").strip().splitlines()[0].strip()
    return ""


@dataclass
class Settings:
    HEIMDALL_SECRET: str
    GEMINI_API_KEY: str
    LOBSTER_TRAP_URL: str
    SEPOLIA_RPC_URL: str
    SEPOLIA_PRIVATE_KEY: str
    SEPOLIA_TO_ADDRESS: str
    REPO_ROOT: Path

    @property
    def lobster_trap_mocked(self) -> bool:
        return not self.LOBSTER_TRAP_URL

    @property
    def sepolia_mocked(self) -> bool:
        return not (self.SEPOLIA_RPC_URL and self.SEPOLIA_PRIVATE_KEY and self.SEPOLIA_TO_ADDRESS)

    @property
    def gemini_available(self) -> bool:
        return bool(self.GEMINI_API_KEY)


settings = Settings(
    HEIMDALL_SECRET=os.environ.get("HEIMDALL_SECRET", "dev-secret-do-not-use-in-prod-32bytes-hex"),
    GEMINI_API_KEY=os.environ.get("GEMINI_API_KEY", "") or _read_key_file(),
    LOBSTER_TRAP_URL=os.environ.get("LOBSTER_TRAP_URL", "").strip(),
    SEPOLIA_RPC_URL=os.environ.get("SEPOLIA_RPC_URL", "").strip(),
    SEPOLIA_PRIVATE_KEY=os.environ.get("SEPOLIA_PRIVATE_KEY", "").strip(),
    SEPOLIA_TO_ADDRESS=os.environ.get("SEPOLIA_TO_ADDRESS", "").strip(),
    REPO_ROOT=REPO_ROOT,
)
