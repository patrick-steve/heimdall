"""SQLAlchemy models and session factory.

Tables:
- agents: registry of every agent in the active vertical
- chain_credentials: every JWT delegation hop, grouped by chain_id
- rule_evaluations: every rule that fired against every chain
- incidents: Gemini-Pro generated incident reports
- agent_behavior_baseline: historical delegations used by behavioral_drift
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import settings


def utcnow() -> datetime:
    """tz-aware UTC now; replaces deprecated datetime.utcnow."""
    return datetime.now(timezone.utc)


DATABASE_URL = f"sqlite:///{settings.REPO_ROOT / 'heimdall.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    tenant_id = Column(String, nullable=False)
    vertical = Column(String, nullable=False)
    owner = Column(String)
    scope = Column(JSON, default=list)
    registered_at = Column(DateTime, default=utcnow)
    last_active_at = Column(DateTime, default=utcnow)
    is_dormant = Column(Boolean, default=False)
    role = Column(String)
    org_id = Column(String, nullable=False, default="demo", index=True)


class ChainCredential(Base):
    __tablename__ = "chain_credentials"
    jti = Column(String, primary_key=True)
    parent_jti = Column(String, nullable=True)
    caller_id = Column(String, nullable=False)
    callee_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    tenant_id = Column(String, nullable=False)
    scope = Column(JSON, default=list)
    value_limit = Column(Integer, nullable=True)
    declared_intent = Column(Text)
    detected_intent = Column(Text)
    issued_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime)
    signature = Column(Text)
    chain_id = Column(String, nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True, default="default")
    org_id = Column(String, nullable=False, default="demo", index=True)


class RuleEvaluation(Base):
    __tablename__ = "rule_evaluations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    chain_id = Column(String, nullable=False, index=True)
    rule_name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)
    layer = Column(String, nullable=False)  # "protocol" or "policy"
    result = Column(String, nullable=False)  # ALLOW | FLAG | DENY
    reason = Column(Text)
    matched_segment = Column(Text)
    evaluated_at = Column(DateTime, default=utcnow)
    session_id = Column(String, nullable=False, index=True, default="default")
    org_id = Column(String, nullable=False, default="demo", index=True)


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True)
    chain_id = Column(String, nullable=False)
    vertical = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    summary = Column(Text)
    full_report = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    session_id = Column(String, nullable=False, index=True, default="default")
    org_id = Column(String, nullable=False, default="demo", index=True)


class AgentBehaviorBaseline(Base):
    __tablename__ = "agent_behavior_baseline"
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String, nullable=False, index=True)
    delegated_to = Column(String, nullable=False)
    action = Column(String, nullable=False)
    chain_depth = Column(Integer, nullable=False)
    observed_at = Column(DateTime, default=utcnow)


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    default_tenant_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(String, primary_key=True)
    org_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    key_prefix = Column(String, nullable=False)
    key_hash = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=utcnow)
    last_used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)


def _ensure_v1_columns() -> None:
    """Add org_id to pre-existing tables when upgrading an old SQLite DB.

    create_all() makes new tables but never alters columns. For installs that
    were running before the v1 auth layer landed, we add org_id ourselves,
    defaulting everything to the Demo org.
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    for table in ("agents", "chain_credentials", "rule_evaluations", "incidents"):
        if not insp.has_table(table):
            continue
        cols = {c["name"] for c in insp.get_columns(table)}
        if "org_id" in cols:
            continue
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN org_id TEXT DEFAULT 'demo'"))
            conn.execute(text(f"UPDATE {table} SET org_id = 'demo' WHERE org_id IS NULL"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_v1_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
