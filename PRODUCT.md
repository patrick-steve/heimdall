# PRODUCT.md

## What it is

**Heimdall** is a runtime governance layer for AI agent delegation chains, built on Veea Lobster Trap. It verifies who an agent is, traces what authority was delegated to it, and enforces policy on the full chain — using capability attenuation so unauthorized actions are unrepresentable, tenant isolation so chains can't cross customer boundaries, behavioral drift detection so anomalies are caught against historical baselines, and a configurable policy engine so organizations can express any governance rule as YAML.

**Tagline:** Nothing crosses without being seen.

**Register:** brand on `/` (landing page — design IS the pitch), product on `/dashboard` (the operator UI — design SERVES the demo).

## Users

Two distinct audiences, served by the two registers:

- **Hackathon judges + Veea mentors + CISOs reading the submission writeup.** Skim the landing page in 90 seconds, decide whether the architecture story is credible, click through to the live dashboard if it is. Aesthetic discrimination is high; they will pattern-match "another SaaS landing page" instantly and bounce.
- **Security operators + compliance analysts** (the persona the dashboard is built for, not yet a real user). Watching delegation chains live, evaluating rule cards, replaying incidents, exporting reports for regulators. Information density matters more than visual flourish.

The landing page is the persuasion surface. The dashboard is the proof.

## Product purpose

To prove the two-layer architecture is real, not a slide. Concretely:

- Land the "mathematically unrepresentable" idea (capability attenuation) so it survives the next conversation the reader has about Heimdall.
- Make Veea Lobster Trap visible as the foundation, not buried as a footnote — Heimdall positions as the ceiling built on Veea's floor.
- Demonstrate horizontality: same engine, three verticals (DeFi, Healthcare, Customer Service), one vertical switcher.
- Be honest about limitations (JWT not Biscuit, set-membership drift not ML, single demo org). The "honest limitations" section is counterintuitive but wins; most submissions overclaim and yours doesn't.

## Tone

Operator-serious. Cryptographically precise. Reads like infrastructure documentation a senior security engineer would respect, not a marketing site that mentions "AI" 14 times. Specific numbers (88%, 63%, 21.9%, 24.4%) — never round, never vague. Verbs over nouns. Terminal-native cadence in places. The Norse name is earned by behaviour, not by Viking imagery.

Anti-tropes: no "transform your business with AI", no "unleash the power of", no abstract gradient orbs, no smiling stock photography, no astronaut. Heimdall is a watchpost, not a brand.

## Anti-references (what this is NOT)

- Not a generic SaaS landing page with a hero, three feature cards, and a CTA.
- Not a "cyberpunk hacker" aesthetic. No glitching letters, no scanlines, no fake terminals with `> rm -rf evil_agent`.
- Not "trust badge soup" (SOC 2, HIPAA, ISO logos lined up as wallpaper).
- Not a Notion/Linear visual clone (warm-cream, soft shadows, friendly illustrations).
- Not the standard observability dashboard look (dark navy + cyan, big number cards, "Status: Healthy ✅").
- Not crypto-neon either — the DeFi vertical is a use case, not the identity.
- No emoji in product copy.

## Brand personality

- **Watchful.** A bridge guardian — observes everything that crosses, never the thing crossing.
- **Architectural.** Talks in layers, primitives, invariants. Has opinions about the math.
- **Self-aware about its scope.** Built on Lobster Trap, says so out loud, names what it's not.
- **Quiet confidence.** Doesn't shout. The product does the shouting via the live dashboard.

## Strategic principles

1. **Lead with the problem, not the solution.** The 2026 statistics carry the cold open. The architecture follows because the problem demanded it.
2. **The two-layer story is the differentiator.** Layer 1 unrepresentability vs Layer 2 configurability is the single idea that has to survive a 90-second skim. Architect the landing page around making that idea inevitable.
3. **Verticals are evidence, not features.** They prove horizontality. The DeFi vertical is the lead demo; healthcare and customer service exist to show the engine is generic.
4. **Honesty is differentiation.** The "honest limitations" section is intentional. Reviewers trust products that name what they aren't.
5. **The dashboard sells itself.** Don't try to recreate the dashboard's drama on the landing page. Tease it, link to it, let the live thing land the close.

## The visible artifacts

- **`/`** — landing page. Hero ("Nothing crosses without being seen"), problem statement (the 2026 stats), the two-layer architecture, the three verticals, the Lobster Trap positioning paragraph, honest limitations, CTAs into `/dashboard` and the repo.
- **`/dashboard`** — the existing live operator console. Chain graph, rule sidebar, agent registry, scenario controls, replay, incident reports, side-by-side ON vs OFF compare view, vertical switcher, Heimdall on/off toggle.

The landing page links to the dashboard. The dashboard links back (small "Heimdall" wordmark in the header). Both share the same color system and type stack so the seam is invisible.
