"""heimdall — operator CLI.

Talks to the same SQLite DB the backend uses. Inside the container:

    docker compose exec backend heimdall keys create --name production
    docker compose exec backend heimdall keys list
    docker compose exec backend heimdall doctor

Locally, just run `heimdall <cmd>` after `pip install -e .` at the repo root.
"""
from __future__ import annotations

import argparse
import os
import sys


def cmd_keys_create(args: argparse.Namespace) -> None:
    from backend.auth import create_api_key, ensure_demo_org
    from backend.db import init_db

    init_db()
    # Make sure the target org exists. For the default demo org we seed it;
    # for any other org id we trust the caller (orgs are provisioned via
    # direct DB inserts today — a `heimdall orgs create` subcommand is a v2
    # nice-to-have).
    if (args.org or "demo") == "demo":
        ensure_demo_org()

    raw, row = create_api_key(args.org or "demo", args.name, env=args.env)
    print(f"id:     {row.id}")
    print(f"prefix: {row.key_prefix}")
    print(f"name:   {row.name}")
    print(f"org:    {row.org_id}")
    print()
    print(f"KEY (shown once): {raw}")


def cmd_keys_list(args: argparse.Namespace) -> None:
    from backend.db import ApiKey, SessionLocal, init_db

    init_db()
    db = SessionLocal()
    try:
        rows = (
            db.query(ApiKey)
            .filter_by(org_id=args.org or "demo")
            .order_by(ApiKey.created_at.desc())
            .all()
        )
        if not rows:
            print(f"(no keys for org '{args.org or 'demo'}')")
            return
        for r in rows:
            state = "active" if r.revoked_at is None else "revoked"
            last = r.last_used_at.isoformat(timespec="seconds") if r.last_used_at else "never"
            print(f"  {r.id}  {r.key_prefix}…  {r.name:<30}  {state:<8}  last_used={last}")
    finally:
        db.close()


def cmd_keys_revoke(args: argparse.Namespace) -> None:
    from backend.db import ApiKey, SessionLocal, init_db, utcnow

    init_db()
    db = SessionLocal()
    try:
        row = db.query(ApiKey).filter_by(id=args.id).first()
        if not row:
            sys.exit(f"no such key: {args.id}")
        if row.revoked_at is not None:
            print(f"already revoked: {row.id}")
            return
        row.revoked_at = utcnow().replace(tzinfo=None)
        db.commit()
        print(f"revoked {row.id} ({row.key_prefix}…)")
    finally:
        db.close()


def cmd_reset(_: argparse.Namespace) -> None:
    from scripts.reset_demo import main as reset_main

    reset_main()


def cmd_doctor(_: argparse.Namespace) -> None:
    from backend.config import settings

    secret_is_default = settings.HEIMDALL_SECRET == "dev-secret-do-not-use-in-prod-32bytes-hex"
    checks: list[tuple[str, str]] = [
        ("LLM (Gemini)", "real" if settings.gemini_available else "mock (no GEMINI_API_KEY)"),
        ("Lobster Trap", "real" if not settings.lobster_trap_mocked else "mock (no LOBSTER_TRAP_URL)"),
        ("Sepolia", "real" if not settings.sepolia_mocked else "mock (no SEPOLIA_* env)"),
        ("HEIMDALL_SECRET", "DEV DEFAULT (insecure!)" if secret_is_default else "set"),
        ("DB path", os.environ.get("HEIMDALL_DB_PATH") or f"{settings.REPO_ROOT / 'heimdall.db'}"),
        ("Allowed origins", os.environ.get("HEIMDALL_ALLOWED_ORIGINS") or "(default: localhost:3000)"),
    ]
    for name, status in checks:
        print(f"  {name:<20} {status}")


def cmd_whoami(args: argparse.Namespace) -> None:
    """Resolve an API key (raw value) to its org without going through HTTP."""
    from backend.auth import hash_api_key
    from backend.db import ApiKey, Organization, SessionLocal, init_db

    init_db()
    db = SessionLocal()
    try:
        row = db.query(ApiKey).filter_by(key_hash=hash_api_key(args.api_key)).first()
        if not row:
            sys.exit("key not recognised")
        org = db.query(Organization).filter_by(id=row.org_id).first()
        print(f"key id:   {row.id}")
        print(f"prefix:   {row.key_prefix}…")
        print(f"name:     {row.name}")
        print(f"org:      {row.org_id} ({org.name if org else '?'})")
        print(f"revoked:  {'yes' if row.revoked_at else 'no'}")
    finally:
        db.close()


def _add_keys_subcommands(parser: argparse.ArgumentParser) -> None:
    sub = parser.add_subparsers(dest="sub", required=True)

    k_create = sub.add_parser("create", help="mint a new API key")
    k_create.add_argument("--name", required=True, help="human-readable label")
    k_create.add_argument("--org", help="org id (default: demo)")
    k_create.add_argument(
        "--env", default="live", choices=["live", "test"], help="key environment prefix"
    )
    k_create.set_defaults(func=cmd_keys_create)

    k_list = sub.add_parser("list", help="list keys for an org")
    k_list.add_argument("--org", help="org id (default: demo)")
    k_list.set_defaults(func=cmd_keys_list)

    k_rev = sub.add_parser("revoke", help="revoke an existing key by id")
    k_rev.add_argument("id", help="key id (e.g. key_abcdef0123)")
    k_rev.set_defaults(func=cmd_keys_revoke)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="heimdall", description="Heimdall operator CLI.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    keys_p = sub.add_parser("keys", help="manage API keys")
    _add_keys_subcommands(keys_p)

    reset_p = sub.add_parser("reset", help="wipe DB and reseed")
    reset_p.set_defaults(func=cmd_reset)

    doctor_p = sub.add_parser("doctor", help="env + mock status report")
    doctor_p.set_defaults(func=cmd_doctor)

    whoami_p = sub.add_parser("whoami", help="look up which org a raw API key belongs to")
    whoami_p.add_argument("api_key", help="the raw hd_test_* / hd_live_* key value")
    whoami_p.set_defaults(func=cmd_whoami)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
