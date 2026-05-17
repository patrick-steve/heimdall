# Heimdall — Handoff

For the next session (Claude or otherwise) picking up this project. Read top to bottom; everything past *"Outstanding"* is reference.

---

## TL;DR

A two-layer governance system for AI agent delegation chains, built on Veea Lobster Trap. Single GitHub repo. Public Vercel + Render deploy in progress.

- **Repo:** https://github.com/patrick-steve/heimdall (public, MIT, `main`)
- **Latest commit:** `8b2f071` — real Lobster Trap integration + dashboard UI cleanup
- **Branch policy:** push directly to `main`, no PRs (hackathon pace)
- **Local working dir:** `C:\Users\patri\Documents\Heimdall`

---

## Where we are right now

| Piece | State |
|---|---|
| Backend (FastAPI) | feature-complete, runs cleanly on Python 3.12.3, per-session state via ContextVars |
| Frontend dashboard | narrative redesign just shipped — 5 acts on the left, technical rail on the right |
| Landing page | tightened spacing, clearer pitch, expanded Lobster Trap section, 6 incidents grid |
| Three verticals | DeFi full, Healthcare full, Customer Service intentionally config-only |
| Twelve example policies | shipped in `policies/examples/` (HIPAA, SOC 2, EU AI Act packs included) |
| Lobster Trap | **real binary integration just shipped** — needs manual Render blueprint sync to come live (see *Next steps*) |
| Sepolia | simulation only by design — user explicitly declined funding a testnet wallet |
| Gemini | live (Flash model; Pro has zero free-tier quota) |
| Per-session isolation | landed in commit `b57c16d`; verified with two-session smoke test |
| GitHub repo | live at github.com/patrick-steve/heimdall, public |
| Render deploy | partially set up (backend likely deployed; Lobster Trap service needs blueprint re-sync) |
| Vercel deploy | likely auto-deploying off main commits; verify URL |

---

## Outstanding (in order of importance)

### 1. Verify the live deploy hasn't drifted
Latest commits weren't smoke-tested against a live Render/Vercel deploy from this session — only locally. Confirm:
- `https://heimdall-backend-xxxx.onrender.com/api/health` returns 200 with the new shape (includes `lobster_trap_mocked` field).
- Vercel's Heimdall URL renders the narrative dashboard, not the older operator console.
- Hard refresh both to bust caches.

### 2. Sync the Render blueprint to deploy Lobster Trap
The `render.yaml` grew a second service (`heimdall-lobstertrap`) in commit `8b2f071`. Render does **not** auto-create new services from blueprint updates. Steps:
1. Render dashboard → Blueprints → existing `heimdall` blueprint → **Manual Sync**.
2. Render proposes the new `heimdall-lobstertrap` service. Click **Apply**.
3. Build takes 3–5 min (clones Veea repo, compiles Go, packages alpine).
4. Once Live, copy its public URL.
5. `heimdall-backend` service → Environment → set `LOBSTER_TRAP_URL` to that URL. Save, rebuild.

### 3. Hackathon-submission items (from plan.md Day 7)
None of these block the demo; all of them are listed in the original `plan.md` ship list and not done yet.

- **`SUBMISSION.md`** — formal submission writeup. Plan.md §"Submission Writeup Structure" lists 9 sections. ~30 min of stitching together prose that already exists in `README.md`, `PRODUCT.md`, and the landing page.
- **Backup demo video** — `demo_script_plan.md` calls for a 1080p screen capture on demo-day eve, saved locally AND uploaded to cloud drive.
- **Live demo practice** — script targets 155 seconds. Practice 5× with a stopwatch.
- **Architecture diagram as image** — currently ASCII in README. Replace with an SVG/PNG.
- **Screenshots** — at least one dashboard mid-attack, one landing hero.

### 4. Optional polish
- **Fund a Sepolia wallet** for real on-chain transactions in Scene 6 (Vercel demo's Etherscan link would actually resolve). 10 min, user previously declined.
- **Lobster Trap end-to-end smoke test** — once the service is deployed, run an attack and verify the real proxy fires `intent_mismatch` from `_lobstertrap.ingress.mismatches`, not the simulation.
- **Per-session behavioral baselines** — currently `agent_behavior_baseline` is a global table. Two sessions share drift history. Acknowledged in `HANDOFF.md`'s known limitations.

---

## Recent session history (chronological)

This session covered a lot. Here's what happened in order, most recent first:

### 7. Real Lobster Trap integration (commit `8b2f071`)
- Removed subsystem-health chips from `TechnicalRail.tsx` (user said "remove this entirely from there")
- Added `lobstertrap_service/Dockerfile` that clones `veeainc/lobstertrap` at build time, compiles, packages
- Added `lobstertrap_service/policy.yaml` in the real Lobster Trap schema (P4-style ingress_rules)
- `render.yaml` grew a second service (`heimdall-lobstertrap`)
- `backend/lobster_client.py` rewritten to speak the real proxy's API (OpenAI chat completions in, `_lobstertrap.ingress` block out)
- `backend/policy_engine.py` `intent_mismatch` rewritten to use category + severity from Lobster Trap metadata; handles three input shapes (canonical category / structured JSON / raw text with injection-pattern fallback for back-compat)
- Simulation path in `lobster_client.py` updated to emit the same shape so local dev mirrors production

### 6. Narrative dashboard redesign (commit `f2d6a23`)
Replaced the dense operator console with a guided five-act narrative:
- New `frontend/components/narrative/` directory: `NarrativeHero`, `Cast`, `Act`, `Narrator`, `CompareAct`, `TechnicalRail`
- New `frontend/lib/plainEnglish.ts` — per-vertical copy decks, scripts, RULE_EXPLANATIONS mapping rule names to plain English
- Old components retained in repo but no longer mounted on dashboard: `Stage`, `ScenarioRail`, `ChainPanel`, `DashboardHeader`, `RuleSummary`
- `IncidentReport` rewritten: explicit status states (`writing…` / `regenerate` / `▷ generate`), human-language error messages, session-aware download URLs
- `backend/endpoints/audit.py` stamps Incident rows with `session_id`

### 5. Per-session state (commit `b57c16d`)
- `backend/session.py` introduces `ContextVar` + `SessionMiddleware`
- `backend/policy_loader.py` replaces module globals with a session-keyed `SessionPolicyState` dict
- `backend/websocket_manager.py` tracks `session_id` per connection; broadcasts route by session
- `chain_credentials`, `rule_evaluations`, `incidents` got `session_id` columns
- `/api/replay/chains` and `/api/agents` filter by current session
- `frontend/lib/session.ts` generates UUID per tab in sessionStorage
- `frontend/lib/api.ts` adds `X-Heimdall-Session` header on every fetch
- `frontend/lib/websocket.ts` appends `?session_id=` to WS URL
- Smoke test: Alice (healthcare) and Bob (DeFi) hit the same backend; full isolation verified

### 4. Vertical-aware scenarios (commit `b57c16d` family)
- Refactored `backend/agents/scenarios.py` to use a per-vertical `ScenarioPack` dataclass
- Healthcare gets full scenarios: triage → records → update; attack via poisoned lab feed
- Customer Service returns `422 {"code": "configuration_only"}` on any scenario endpoint
- Frontend `Stage` and `ScenarioRail` show vertical-specific labels (Triage / Add prescription / Lab feed attack / Attack OFF for healthcare)
- Customer Service falls through to `ConfigurationOnly` empty state with five-item integration checklist

### 3. Landing page polish (commits `28b32b4` + `9a6c322`)
- Tightened vertical rhythm (`py-24/36` → `py-16/24`)
- Hero pitch rewritten with lock-vs-guard mental model, plain English
- Six incidents in the Problem section (Step Finance, Mexican govt, Replit, Anthropic agentic ops, plus two clearly-tagged sector patterns: Healthcare BAA expiry, CS refund escalation)
- §04 Lobster Trap section expanded into 3-block grid (what / why / how) + 5-step walkthrough + code excerpt

### 2. Compare view + dashboard panels (commit `c5aeca5`)
- Compare ON vs OFF view is full-width and self-contained: per-side verdict cards, chain canvases, rule lists, evidence, side-by-side incident reports, diff strip
- Compare toggle promoted into the ScenarioRail (was buried in a tertiary card before)
- `ChainPanel` wraps `ChainCanvas` with verdict header + rule cards + evidence + inline incident report

### 1. Earlier (initial commit + asset wiring)
- Initial commit + GitHub repo creation (`5c51e16`)
- Landing page built per impeccable skill spec
- LICENSE, README, DEPLOY.md
- Heimdall mark + Veea Lobster Trap mark + grain.png assets dropped into `frontend/public/`
- URL corrections (github.com/veea-io/ → github.com/veeainc/)
- Per-session refactor (commit `b57c16d`)

---

## How to run locally

Single terminal sanity:

```bash
cd C:\Users\patri\Documents\Heimdall
python -m pip install -r backend/requirements.txt  # one-time
cd frontend && npm install && cd ..                # one-time
python -m scripts.reset_demo                       # wipe + seed baselines
```

Then two terminals:

```bash
# Terminal A — backend
python -m uvicorn backend.main:app --port 8000 --reload

# Terminal B — frontend
cd frontend && npm run dev
```

Open http://localhost:3000 (landing) and http://localhost:3000/dashboard (operator console).

Optional Lobster Trap real binary locally (requires Docker):

```bash
docker build -t heimdall-lt lobstertrap_service/
docker run -p 8080:8080 -e LT_BACKEND="https://generativelanguage.googleapis.com/v1beta/openai" heimdall-lt

# In Terminal A, before starting uvicorn:
export LOBSTER_TRAP_URL=http://localhost:8080
```

---

## Architecture mental model

```
Browser tab (UUID in sessionStorage)
   │  X-Heimdall-Session header + ?session_id= WS query
   ▼
Vercel (Next.js)
   │
   ▼
Render heimdall-backend (FastAPI)
   │  SessionMiddleware → ContextVar
   │  per-session: active_vertical, heimdall_enabled
   │  global: agents table (filtered by vertical), baselines, incidents
   │
   ▼  (when LOBSTER_TRAP_URL set)
Render heimdall-lobstertrap (Go binary)
   │  DPI on every prompt
   │  injects _lobstertrap.ingress.mismatches on response
   │
   ▼
Google's OpenAI-compatible Gemini endpoint
   gemini-flash-latest
```

**Two layers of enforcement:**
- Layer 01 (`backend/jwt_chain.py`) — capability attenuation + tenant isolation. Enforced at credential sign time. Attacks here are unrepresentable.
- Layer 02 (`backend/policy_engine.py`) — six rule primitives evaluated against the full chain. YAML-configurable per vertical.

---

## Key files

| Path | Purpose |
|---|---|
| `backend/main.py` | FastAPI entry, middleware mount, WS handler |
| `backend/session.py` | ContextVar + SessionMiddleware |
| `backend/policy_loader.py` | Per-session state, vertical YAML loading |
| `backend/policy_engine.py` | 6 rule primitives |
| `backend/jwt_chain.py` | Layer 01 enforcement |
| `backend/agents/scenarios.py` | ScenarioPack per vertical, demo orchestration |
| `backend/lobster_client.py` | Real Lobster Trap + simulation |
| `backend/audit.py` | Gemini Flash incident report streaming |
| `backend/endpoints/*.py` | register / delegate / audit / vertical / replay / toggle |
| `backend/websocket_manager.py` | Per-session WS broadcasts |
| `verticals/*/` | agents.yaml, prompts.yaml, policy.yaml, lobster_trap.yaml, tools.py |
| `policies/examples/*.yaml` | 12 reference policies (HIPAA, SOC 2, EU AI Act, …) |
| `scripts/reset_demo.py` | Wipe DB + reseed baselines |
| `scripts/seed_db.py` | Seed `agent_behavior_baseline` for drift detection |
| `scripts/run_attack.py` | Curl-driven six-scene smoke test |
| `frontend/app/page.tsx` | Landing |
| `frontend/app/dashboard/page.tsx` | Narrative dashboard |
| `frontend/components/narrative/*` | Act, Cast, NarrativeHero, CompareAct, TechnicalRail |
| `frontend/components/ChainCanvas.tsx` | Deterministic horizontal chain renderer |
| `frontend/lib/plainEnglish.ts` | Per-vertical copy + RULE_EXPLANATIONS |
| `frontend/lib/session.ts` | UUID per tab |
| `frontend/lib/api.ts`, `websocket.ts` | Session-aware clients |
| `lobstertrap_service/Dockerfile` | Builds Veea Lobster Trap container |
| `lobstertrap_service/policy.yaml` | Heimdall-tuned Lobster Trap policy (real schema) |
| `render.yaml` | Two-service blueprint (backend + lobstertrap) |
| `plan.md` | Master plan (user-authored) — single source of truth |
| `implementation.md` | Build specification (user-authored) |
| `demo_script_plan.md` | 135-second demo script (user-authored) |
| `PRODUCT.md`, `DESIGN.md` | Impeccable skill context |
| `README.md`, `DEPLOY.md` | Public-facing docs |

---

## Decisions locked in (don't undo)

These were chosen deliberately and reverting them would break the demo narrative or violate the plan:

- **JWT HS256, not Biscuit tokens** — plan.md NOT-BUILDING list
- **6 rule primitives, no more** — adding a 7th was explicitly listed as an anti-pattern
- **4 agent roles** (coordinator, data_fetcher, executor, shadow) — same across all verticals
- **3 verticals: DeFi full, Healthcare full, Customer Service yaml-only** — CS being configuration-only is a feature, not a gap
- **Capability attenuation enforced at credential construction**, not by a rule — this is the "mathematically unrepresentable" story
- **No tests, no Docker (except the Lobster Trap container), no Kubernetes** — single-process, localhost or single Render service
- **gemini-flash-latest everywhere** — Pro has 0 free-tier quota, do not switch
- **Mock auto-engages when env vars missing** — `settings.gemini_available`, `settings.lobster_trap_mocked`, `settings.sepolia_mocked`
- **Per-session via ContextVars**, not per-function threading
- **Sepolia stays as a simulation** — user explicitly declined funding a wallet on 2026-05-17
- **`agent_behavior_baseline` is global** (not per-session) — known limit, acceptable for the demo
- **Customer Service Stage shows a five-item integration checklist** — honest empty state, not a "coming soon"
- **Compare ON vs OFF is in the ScenarioRail, not buried** — promoted on user feedback
- **Narrator captions are vertical-keyed in `plainEnglish.ts`** — adding a 4th vertical means adding entries to CAST, ROUTINE_COPY, ATTACK_COPY, ROUTINE_SCRIPT, ATTACK_SCRIPT, RAILS, and STEPS

---

## Known footguns

- **GEMINI_KEY.txt is gitignored.** Never commit it. The user pasted a real key into it; the .gitignore protects it but check before any `git add -A`.
- **Render free tier cold start is 30–60s after 15 min idle.** Hitting `/api/health` from a cron does not solve this (Render's free tier limits include request counts). Expected and documented in DEPLOY.md.
- **`gemini-pro-latest` aliases to `gemini-3.1-pro` which has ZERO free-tier quota.** All Gemini calls use `gemini-flash-latest`. If you switch to Pro you will get 429s.
- **Stale `.next/` cache** breaks the dev server after `next build`. Symptom: `/dashboard` returns 500. Fix: `rm -rf frontend/.next` then restart dev.
- **Multiple Next.js processes pile up** if dev server isn't cleanly stopped. Each new `npm run dev` falls back to 3001, 3002, etc. Visible symptom: scenarios run but dashboard doesn't update because the browser is hitting the wrong port. Kill all node processes on 3000-3010 before starting fresh.
- **SQLite is single-writer.** Don't open two backend processes against the same `heimdall.db` file.
- **`reset_demo.py` deletes `heimdall.db`** — non-recoverable. Only use when DB schema actually changed.
- **Pyright shows endless import errors in editor.** Runtime is fine — they're cosmetic, the IDE just can't find the Python venv.
- **`gh repo create --push` works**; `gh push` does not exist. Use plain `git push` after the initial repo creation.
- **The `Lobster Trap` Go binary repo is `veeainc/lobstertrap` NOT `veea-io/lobstertrap`.** All five frontend components and the README were corrected; double-check before adding more references.
- **CRLF warnings on every commit** because the repo was initialised on Windows. Harmless.
- **The dashboard has TWO live status indicators** that I removed in commit `8b2f071`: the dashboard previously showed gemini/lobster/sepolia chips. They're gone now. If you re-introduce them, do so with copy that explains "simulated" rather than "mock".

---

## Memory pointers

Persistent memory for this project lives at:
- `C:\Users\patri\.claude\projects\C--Users-patri-Documents-Heimdall\memory\heimdall_project.md` — project context
- `C:\Users\patri\.claude\projects\C--Users-patri-Documents-Heimdall\memory\build_preferences.md` — user's sequencing + mock fallback preferences

If you find them stale, update them rather than relying on a fresh read of the codebase.

---

## Open questions for the next session

These came up in this session and were not fully resolved:

1. **Should the dashboard surface a "simulated subsystem" banner anywhere?** User removed the live-state chips because they were confusing. If a judge tests the live deploy before Lobster Trap is connected, they might wonder why nothing's "real." Consider a one-line note somewhere subtle.
2. **Should `agent_behavior_baseline` become per-session?** Currently global; means two sessions share drift detection. Probably fine for a demo, but worth deciding before scaling.
3. **Submission writeup is not done.** Plan.md §"Submission Writeup Structure" is the spec. Most of the prose exists in README.md, PRODUCT.md, the landing page, and DEPLOY.md — assembly takes ~30 min.

---

## Quick smoke-test recipe

After any non-trivial backend change, this is the fastest end-to-end check:

```bash
cd C:\Users\patri\Documents\Heimdall
python -m scripts.reset_demo
python -m uvicorn backend.main:app --port 8000 &
sleep 4
SID="smoke-$(date +%s)"
curl -s -H "X-Heimdall-Session: $SID" -X POST http://127.0.0.1:8000/api/scenario/attack -d '{}' -H "Content-Type: application/json" > /dev/null
PYTHONIOENCODING=utf-8 python -c "
import sys; sys.path.insert(0,'.')
from backend.db import SessionLocal, RuleEvaluation
db = SessionLocal()
deny = db.query(RuleEvaluation).filter_by(layer='protocol', result='DENY').first()
for e in db.query(RuleEvaluation).filter_by(chain_id=deny.chain_id).all():
    if e.result != 'ALLOW':
        print(f'  [{e.layer:>8}] {e.rule_name:<25} {e.result:<5}')
"
```

Expected output (6 violations):

```
  [protocol] capability_attenuation    DENY
  [  policy] dormant_agent_block       DENY
  [  policy] value_threshold_by_depth  DENY
  [  policy] shadow_to_executor_pattern DENY
  [  policy] declared_intent_check     FLAG
  [  policy] behavioral_drift_check    FLAG
```

If you get fewer than six, something's broken in `scripts/seed_db.py`, the scenario, or the rule engine.
