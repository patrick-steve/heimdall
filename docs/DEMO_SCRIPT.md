# Heimdall — Demo Guide

> Five-minute live demo of the dashboard. Pair with the `/deck` slides for the
> full pitch arc. Tight, scripted, recoverable.

---

## Before you start (5 minutes of prep, do it once)

### 1. Warm the stack

Render free tier spins down after 15 min idle. Wake both services before
the demo window starts and keep them warm:

```bash
# In a terminal, kept open during the demo
while true; do
  curl -s -o /dev/null https://heimdall-backend.onrender.com/api/health
  curl -s -o /dev/null https://heimdall-lobstertrap.onrender.com/
  sleep 300
done
```

Or if running locally:

```bash
cp .env.example .env
# Pin a stable demo key so screenshots reproduce
echo 'HEIMDALL_DEMO_API_KEY=hd_test_demo' >> .env
docker compose up -d
```

### 2. Reset to a clean ledger

```bash
docker compose exec backend heimdall reset
# or, locally:
python -m scripts.reset_demo
```

This wipes `heimdall.db` and re-seeds behavioural baselines so the
`behavioral_drift` rule has historical data to flag against.

### 3. Tabs in your browser, in order

| Tab | URL                                       | When you switch |
|-----|-------------------------------------------|------------------|
| 1   | `/` (landing)                             | 0:00 — open frame |
| 2   | `/dashboard`                              | 0:30 — main demo |
| 3   | `/deck` (or the exported PDF)             | hold for Q&A |
| 4   | A terminal with `docker compose logs -f backend` | only if something goes wrong |

### 4. Set the dashboard to DeFi + Heimdall ON

Open `/dashboard`. Top of the page:

- **Vertical selector** → `DeFi` (it's the default; verify).
- **Heimdall toggle** → `ON` (green dot).
- The chain canvas should be empty with "press play".

### 5. Pre-fly checks

| Check                                                        | Expected |
|--------------------------------------------------------------|----------|
| `curl /api/health` returns `gemini_available: true`          | yes      |
| `curl /api/health` returns `lobster_trap_mocked: false`      | yes (Render) |
| Dashboard WebSocket shows `ws · connected` in the header     | yes      |
| Cast section lists 4 agents (coordinator, market data, executor, shadow) | yes |

If any of these are wrong, fix before talking — the audience will see it.

---

## The 5-minute script

> Timing in **bold**. Actions in `monospace`. What to say in plain prose.

### **0:00 — 0:30 · Open frame** *(landing page)*

> "AI agents now hand authority to other agents to get work done. Nobody is
> watching what gets handed off. Heimdall is the air traffic control for
> that hand-off — one class of attack made unrepresentable, the rest visible
> and configurable."

Action: scroll once on the landing page to show the architecture diagram, then click `Open watchpost` (top right).

### **0:30 — 1:00 · Meet the cast** *(dashboard, Cast section)*

> "Four DeFi agents. A coordinator that takes the user's intent. A market
> data agent. An executor that signs Sepolia transfers. And a shadow
> account — an agent that was set up months ago and forgotten."

Action: hover over each agent card in the Cast section. Point out the
`scope` chips (`read:portfolio`, `execute:trade`, etc.).

Key beat: the audience must understand that **each agent carries different
capabilities**. The attack later depends on this.

### **1:00 — 1:45 · A normal day** *(Act 02 — Routine)*

> "Watch a normal user request. The coordinator delegates to market data.
> Heimdall signs each hop. The rule sidebar lights up green."

Action: click `▷ Run routine`. Two hops draw on the canvas. The rule
sidebar fills with allow cards.

While it runs:

> "Two signed hops. Every rule fired ALLOW. Both layers — protocol and
> policy — agreed. Chain depth two. Notice the rule cards aren't decoration;
> each one is a YAML primitive that ran against the real chain."

### **1:45 — 3:00 · The attack** *(Act 03 — the headline moment)*

> "Now the same agent stack gets a poisoned external feed."

Action: click `▷ Run attack`. Three things happen in sequence — pause and
narrate each:

1. **Hops 1 and 2 draw normally.**
   > "User → coordinator → market data. Fine so far."

2. **A yellow flag fires.**
   > "Lobster Trap sees prompt-injection patterns in the external feed.
   > That's the integration with Veea — a DPI proxy sitting between every
   > agent and the model behind it."

   Point at the new **DPI evidence card** that appears under the canvas.
   > "Declared on the left, detected on the right. The agent said 'fetch
   > market sentiment'. The proxy saw 'invoke agent with elevated scope.'
   > That's the prompt injection in flight."

3. **A red deny burst fires on the canvas.**
   > "Now the compromised market data agent tries to forge `execute:trade`
   > scope and hand it to the shadow account. Heimdall's signing function
   > refuses. **Layer 1 — capability attenuation.** The credential is never
   > minted. The executor never receives a JWT to act on. There is no rule
   > to bypass; the cryptography itself is what refuses."

Point at the rule sidebar. `capability_attenuation DENY` is at the top.
Open it; show `scope ['execute:trade'] ⊄ parent scope`.

### **3:00 — 4:00 · Without Heimdall** *(Compare Act — counterfactual)*

> "Watch the same chain with Heimdall off."

Action: in the Compare Act, click `▷ Run with Heimdall OFF`.

> "Same agents. Same external content. No protocol layer. The forged
> credential is signed because no one is checking. The executor receives
> it and broadcasts a Sepolia transfer."

Point at the green tx URL chip that appears.

> "$27M, real on-chain. That's what makes the protocol layer non-optional.
> The point of Heimdall isn't that *one more rule fired*. The point is that
> a class of attack stopped being representable at all."

### **4:00 — 4:30 · The incident report** *(optional)*

Action: click the chain ID in the right rail → `View incident report`.

> "Every blocked or flagged chain auto-generates a Markdown incident memo
> via Gemini. Compliance and security teams subscribe to these."

(Skip this if you're tight on time. The slide deck covers it.)

### **4:30 — 5:00 · Close**

> "Two-minute install. Five-minute integration. Three lines of SDK around
> each agent call. MIT licensed. Built on Veea Lobster Trap.
>
> Heimdall is at github.com/patrick-steve/heimdall, the live dashboard is
> at heimdall-backend.onrender.com/dashboard, and the docs walk you from a
> fresh clone to a first delegation in five minutes."

End on the dashboard with the attack still showing — the red BLOCKED chip
is the last thing on screen.

---

## What to expect on stage

### The WebSocket may stutter on slow networks

If events arrive out of order, the chain canvas still renders correctly
(it derives state from accumulated events). Don't apologise — point it out:

> "The WebSocket replays the chain state, so even if a packet drops the
> picture catches up."

### Cold-start the first time you hit Render that day

Free tier wakes in 30-60s. If the landing page hangs, refresh once. Or run
the keep-warm loop in the prep section.

### Gemini rate limits

If you've run the attack 5+ times in a few minutes, the incident memo step
can rate-limit. The memo skip is graceful — the dashboard still shows
BLOCKED. Don't open the incident report panel as a recovery move.

### Toggle state can stick

If Heimdall is OFF from the Compare Act and you forget to flip it back,
the next `Run attack` won't block. **Always confirm the toggle is green
before saying "watch the protocol refuse".**

---

## If something breaks (backup plans)

| Symptom                              | Recovery                                                                 |
|--------------------------------------|--------------------------------------------------------------------------|
| Dashboard shows no agents             | Refresh once. If still empty: `docker compose exec backend heimdall reset` |
| `WS · disconnected` in header         | Refresh. The page reconnects on mount.                                  |
| Run attack does nothing               | Check Heimdall toggle is ON. Check vertical selector is DeFi.           |
| Incident report endpoint hangs        | Skip it — don't open it during the demo. The block already happened.    |
| Render service throws 502             | Switch to the `/deck` PDF and narrate from there. Live demo is upside, not floor. |

---

## Audience questions you'll get (and the right answer)

**Q. How is this different from a JWT-based auth library?**

> Auth libraries validate that a caller is who they claim to be. Heimdall
> validates the *chain of authority that brought them here*. The protocol
> layer enforces that a child credential can only carry a subset of its
> parent's scope — there's no way for a deeply-nested call to claim a
> capability that wasn't passed down the chain. That's the unrepresentable
> piece. Layer 2 is then the operator's runtime policy on top.

**Q. Why not just use OPA / Cedar / a rules engine?**

> Layer 2 is essentially that, scoped to this domain. Six primitives, YAML,
> hot-reloadable. The new thing is Layer 1 — the cryptographic attenuation
> that makes a class of policy questions disappear before any rules engine
> runs.

**Q. What about Veea Lobster Trap? Is this competing?**

> Complementary. Lobster Trap inspects what an agent says to a model.
> Heimdall inspects what agents say to each other. Two boundaries, no
> overlap. The Step Finance attack crosses both — Lobster Trap catches the
> injection at the model boundary, Heimdall catches the unauthorised
> delegation at the agent boundary.

**Q. Performance overhead?**

> The hot path is `POST /api/v1/delegate` — single DB row insert plus six
> rule evaluations over the current chain. Sub-10ms in our smoke tests. The
> SDK adds one HTTP round-trip per agent-to-agent hop, comparable to a
> Stripe API call before charging a card.

**Q. What's the roadmap?**

> Three things. Plain-English-to-YAML rule authoring via Gemini. Dry-run
> mode that replays historical chains against candidate rules before they
> hit production. And traffic-mined rule suggestions — shadow mode for a
> week, cluster the chains the gateway saw, propose the rules the operator
> never thought to write. All three are extensions of code that already
> ships; none of them is a new product.

**Q. What's missing?**

> Real prompt-injection ML (we delegate that to Veea), production-grade
> behavioural drift (current implementation is set-membership; production
> would use embedding similarity), and a real multi-tenant policy server.
> All called out in the Honest Limitations section of the landing page.

---

## Variations

### Lightning version (90 seconds)

Skip routine (it's the warm-up; the audience can intuit it). Open
dashboard → run attack → narrate the red burst and DPI card → toggle off
→ run again → show the green tx. End. Two scenes, one comparison, done.

### Deep version (10 minutes)

Add after the attack scene:

- **Switch verticals** to Healthcare. Run the same attack pattern. Show
  that the *same primitives* catch a different attack (PHI rewrite, BAA
  isolation). The point: one engine, three packs.
- **Open `policies/examples/compliance_pack_hipaa.yaml`**. Walk through
  two rules and the HIPAA §164 sections they operationalise.
- **Show the v1 API** by curl-ing `/api/v1/delegate` from a terminal.
  Audience sees that the dashboard isn't the product — the gateway is.

### Q&A-only version

If you're slotted into a panel rather than a stage, the slide deck stands
alone. Hand judges the PDF, walk to the dashboard for the attack scene
only, then answer questions.
