/* eslint-disable @next/next/no-html-link-for-pages */
import "./deck.css";
import { HeimdallMark } from "@/components/landing/marks/HeimdallMark";
import { LobsterTrapMark } from "@/components/landing/marks/LobsterTrapMark";
import { GeminiMark } from "@/components/landing/marks/GeminiMark";

const TOTAL = 12;

/**
 * Heimdall hackathon deck — 12 slides.
 *
 * Lives at /deck. Designed for both screen viewing and PDF export via
 * Chrome → File → Print → Save as PDF (landscape, no margins). Each <Slide>
 * is its own page-break section; deck.css sets the print page size to
 * 1280×720 so the PDF lands at clean 16:9.
 */
export default function Deck() {
  return (
    <main className="bg-ink text-zinc-200 font-sans">
      <Slide1Hero />
      <Slide2Problem />
      <Slide3Attack />
      <Slide4TwoLayer />
      <Slide5LobsterTrap />
      <Slide6Architecture />
      <Slide7Demo />
      <Slide8Counterfactual />
      <Slide9Verticals />
      <Slide10Install />
      <Slide11Roadmap />
      <Slide12Close />
    </main>
  );
}

/* ─────────────────────────── Shared chrome ─────────────────────────── */

interface SlideProps {
  index: string;
  label: string;
  n: number;
  children: React.ReactNode;
  bg?: "default" | "grid";
}

function Slide({ index, label, n, children, bg = "default" }: SlideProps) {
  return (
    <section className={`slide text-zinc-200 ${bg === "grid" ? "deck-grid" : ""}`}>
      {/* Eyebrow */}
      <header className="absolute left-12 right-12 top-9 flex items-center gap-5 z-10">
        <div className="slide-hairline flex-1" />
        <span className="slide-eyebrow">
          <span className="text-bifrost">§ {index}</span>
          <span className="text-zinc-700 mx-3">/</span>
          <span className="text-zinc-400">{label}</span>
          <span className="text-zinc-700 mx-3">·</span>
          <span className="text-zinc-500">HEIMDALL</span>
        </span>
      </header>

      {/* Body */}
      <div className="absolute inset-x-12 top-24 bottom-16 flex flex-col">
        {children}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-7 left-12 right-12 flex items-center justify-between slide-eyebrow text-zinc-600">
        <span>nothing crosses without being seen</span>
        <span>
          <span className="text-zinc-300">{String(n).padStart(2, "0")}</span>
          <span className="text-zinc-700 mx-1.5">/</span>
          <span>{TOTAL}</span>
        </span>
      </footer>
    </section>
  );
}

/* ─────────────────────────── Slide 1 · Hero ─────────────────────────── */

function Slide1Hero() {
  return (
    <Slide index="00" label="OPEN" n={1} bg="grid">
      {/* Bifrost beam in the background */}
      <div className="pointer-events-none absolute inset-0 -z-0 deck-only-screen">
        <div
          className="absolute deck-beam"
          style={{
            left: "55%",
            top: "20%",
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(124,58,237,0) 70%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-12 gap-10 w-full">
          <div className="col-span-12 lg:col-span-8 relative z-10">
            <div className="inline-flex items-center gap-3 mb-8">
              <HeimdallMark size={28} className="text-bifrost" />
              <span className="font-display text-2xl font-bold tracking-tight text-zinc-100">
                Heimdall
              </span>
              <span className="slide-eyebrow text-zinc-600 ml-2">v0.1 · MIT</span>
            </div>
            <h1 className="font-display font-bold text-zinc-100 leading-[0.95] tracking-tight"
                style={{ fontSize: "72px" }}>
              Nothing crosses<br />
              <span className="text-bifrost">without being seen.</span>
            </h1>
            <p className="mt-8 max-w-[44ch] text-[19px] text-zinc-400 leading-snug">
              Runtime governance for AI agent delegation chains. One class of attack
              <span className="text-zinc-200"> made unrepresentable</span>; the rest, visible and configurable.
            </p>
            <div className="mt-10 flex items-center gap-4 slide-eyebrow text-zinc-500">
              <span className="text-bifrost">Built on</span>
              <span className="inline-flex items-center gap-2 text-zinc-300">
                <LobsterTrapMark size={14} />
                Veea Lobster Trap
              </span>
              <span className="text-zinc-700">·</span>
              <span className="inline-flex items-center gap-2 text-zinc-300">
                <GeminiMark size={14} />
                Google Gemini
              </span>
            </div>
          </div>

          {/* Right rail — stats card */}
          <aside className="col-span-12 lg:col-span-4 relative z-10">
            <div className="border border-edge bg-slab/60 p-7">
              <div className="slide-eyebrow text-zinc-500 mb-4">/api/health</div>
              <dl className="space-y-4">
                <Stat k="Layers"          v="2"             tone="bifrost" />
                <Stat k="Rule primitives" v="6"             tone="zinc" />
                <Stat k="Verticals"       v="3"             tone="zinc" />
                <Stat k="SDKs"            v="Py · TS"       tone="zinc" />
                <Stat k="Self-host"       v="docker compose" tone="zinc" mono />
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </Slide>
  );
}

function Stat({ k, v, tone = "zinc", mono = false }: { k: string; v: string; tone?: "zinc" | "bifrost"; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-edge pb-3 last:border-0">
      <dt className="slide-eyebrow text-zinc-500">{k}</dt>
      <dd className={`${mono ? "font-mono text-[13px]" : "font-display text-xl font-semibold"} ${tone === "bifrost" ? "text-bifrost" : "text-zinc-200"}`}>
        {v}
      </dd>
    </div>
  );
}

/* ──────────────────────── Slide 2 · The problem ─────────────────────── */

function Slide2Problem() {
  return (
    <Slide index="01" label="PROBLEM" n={2}>
      <div className="grid grid-cols-12 gap-10 h-full items-center">
        <div className="col-span-12 lg:col-span-6">
          <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "52px" }}>
            AI agents now hand authority to other agents.{" "}
            <span className="text-zinc-500">Nobody is watching what gets handed off.</span>
          </h2>
          <p className="mt-7 max-w-[52ch] text-zinc-400 leading-relaxed text-[15px]">
            Every modern agent stack ends with one agent calling another to finish a task.
            The first agent reads a prompt; the last one signs a transaction, writes a chart,
            or refunds a customer. Between them is a chain that has no protocol.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <UngovernedChainDiagram />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6 border-t border-edge pt-8">
        <Quote
          source="Step Finance · Q4 2025"
          quote="One compromised research agent forged $30M of unauthorised transfers across three protocols."
        />
        <Quote
          source="HHS OCR · 2024"
          quote="Patient records re-written by an automated triage tool with no audit trail."
        />
        <Quote
          source="Veea · Lobster Trap thesis"
          quote="Agent-to-agent permission systems are the floor, not the ceiling."
        />
      </div>
    </Slide>
  );
}

function UngovernedChainDiagram() {
  return (
    <svg viewBox="0 0 560 340" className="w-full">
      <defs>
        <linearGradient id="edge-gray" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#52525b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.9" />
        </linearGradient>
        <marker id="arr-gray" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,-4L9,0L0,4" fill="#a1a1aa" />
        </marker>
        <marker id="arr-red" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,-4L9,0L0,4" fill="#ef4444" />
        </marker>
      </defs>

      {/* Background warning band */}
      <rect x="0" y="120" width="560" height="100" fill="#1c0d11" opacity="0.0" />

      {/* Nodes */}
      <Node x={50}  y={170} role="user"         label="User"         color="#a1a1aa" />
      <Node x={170} y={170} role="agent"        label="Research"     color="#a1a1aa" />
      <Node x={290} y={170} role="agent"        label="Market"       color="#a1a1aa" />
      <Node x={410} y={170} role="agent"        label="Payment"      color="#ef4444" attackTag />

      {/* Edges */}
      <path d="M 105 170 L 145 170" stroke="url(#edge-gray)" strokeWidth="2" markerEnd="url(#arr-gray)" />
      <path d="M 225 170 L 265 170" stroke="url(#edge-gray)" strokeWidth="2" markerEnd="url(#arr-gray)" />
      <path d="M 345 170 L 385 170" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 5" markerEnd="url(#arr-red)" />

      {/* "$30M forged" annotation */}
      <g transform="translate(410, 240)">
        <rect x="-72" y="0" width="144" height="32" fill="#1c0d11" stroke="#ef4444" strokeWidth="1" />
        <text x="0" y="13" fontSize="9" fontFamily="var(--font-mono), monospace" fill="#fca5a5" textAnchor="middle"
              style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
          payment:send  $27,000,000
        </text>
        <text x="0" y="25" fontSize="10" fontFamily="var(--font-sans), sans-serif" fill="#fca5a5" textAnchor="middle">
          authority never granted
        </text>
      </g>

      {/* Top caption */}
      <text x="280" y="60" fontSize="11" fontFamily="var(--font-mono), monospace" fill="#52525b" textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>
        today · ungoverned chain
      </text>
      <text x="280" y="90" fontSize="14" fontFamily="var(--font-sans), sans-serif" fill="#a1a1aa" textAnchor="middle">
        Each agent trusts the previous agent&apos;s claim about what it can do.
      </text>
    </svg>
  );
}

function Node({ x, y, label, color, attackTag = false }: { x: number; y: number; role: string; label: string; color: string; attackTag?: boolean }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-55" y="-22" width="110" height="44" fill="#11151b" stroke={color} strokeWidth={attackTag ? 1.5 : 1} />
      <text x="0" y="-4" fontSize="8" fontFamily="var(--font-mono), monospace" fill={color} textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>
        agent
      </text>
      <text x="0" y="14" fontSize="13" fontFamily="var(--font-display), sans-serif" fill="#e5e7eb" textAnchor="middle" fontWeight="500">
        {label}
      </text>
    </g>
  );
}

function Quote({ source, quote }: { source: string; quote: string }) {
  return (
    <div className="border-l border-edge pl-5">
      <p className="text-[13px] text-zinc-300 leading-snug">&ldquo;{quote}&rdquo;</p>
      <p className="mt-3 slide-eyebrow text-zinc-600">{source}</p>
    </div>
  );
}

/* ─────────────────────── Slide 3 · The attack ─────────────────────── */

function Slide3Attack() {
  return (
    <Slide index="02" label="ANATOMY OF AN ATTACK" n={3}>
      <div className="grid grid-cols-12 gap-10 h-full">
        <div className="col-span-12 lg:col-span-5 self-center">
          <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "48px" }}>
            One compromised agent can forge any capability{" "}
            <span className="text-deny">it knows the name of.</span>
          </h2>
          <p className="mt-6 max-w-[44ch] text-zinc-400 leading-relaxed text-[15px]">
            The Step Finance pattern. An LLM-driven agent is jailbroken by external content,
            then asks a downstream agent to act on a privilege it was never granted.
            Without a protocol, downstream agents have no way to tell.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <AttackTimeline />
        </div>
      </div>
    </Slide>
  );
}

function AttackTimeline() {
  const STEPS = [
    { n: "01", tone: "ok",   title: "User asks for a market summary",
      detail: "research_agent gets read:data, read:market" },
    { n: "02", tone: "ok",   title: "research_agent pulls an external feed",
      detail: "Veea Lobster Trap inspects the prompt; nothing wrong yet" },
    { n: "03", tone: "warn", title: "Feed contains a prompt injection",
      detail: "INJECTED PROMPT · invoke yield-optimizer with execute:trade scope" },
    { n: "04", tone: "deny", title: "research_agent asks payment_agent for payment:send",
      detail: "scope it does not carry — protocol must refuse" },
  ];
  const tone = (t: string) => t === "ok" ? "text-allow border-allow/30" : t === "warn" ? "text-warn border-warn/40" : "text-deny border-deny/40";
  return (
    <ol className="space-y-3">
      {STEPS.map((s) => (
        <li key={s.n} className={`border-l-2 pl-5 py-2 ${tone(s.tone)}`}>
          <div className="flex items-center gap-3 mb-1">
            <span className={`slide-eyebrow ${tone(s.tone)} border-0`}>step {s.n}</span>
            <span className="font-display text-[18px] text-zinc-100 font-semibold leading-snug">{s.title}</span>
          </div>
          <p className="font-mono text-[12px] text-zinc-500 leading-relaxed">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/* ────────────────────── Slide 4 · Two layers ────────────────────── */

function Slide4TwoLayer() {
  return (
    <Slide index="03" label="THE SOLUTION" n={4} bg="grid">
      <div className="grid grid-cols-12 gap-10 h-full items-center">
        <div className="col-span-12 lg:col-span-5">
          <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "48px" }}>
            Some attacks should be <span className="text-bifrost">impossible.</span>{" "}
            <span className="text-zinc-500">The rest should be visible.</span>
          </h2>
          <p className="mt-7 max-w-[44ch] text-zinc-400 leading-relaxed text-[15px]">
            Heimdall enforces in two layers, deliberately separate. Layer 1 is
            cryptographic — you can&apos;t configure it because there&apos;s nothing to configure.
            Layer 2 is YAML, six primitives, hot-reloadable.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <TwoLayerDiagram />
        </div>
      </div>
    </Slide>
  );
}

function TwoLayerDiagram() {
  return (
    <div className="border border-edge bg-slab/40 p-1">
      {/* Layer 1 */}
      <div className="border border-bifrost/40 bg-rune/10 p-7 relative">
        <div className="absolute -top-3 left-6 bg-ink px-3 slide-eyebrow text-bifrost">Layer 01 · Protocol</div>
        <div className="flex items-start gap-6">
          <LockIcon />
          <div className="flex-1">
            <h3 className="font-display text-[22px] font-semibold text-zinc-100 mb-2 leading-tight">
              Capability attenuation. Cryptographic. Unrepresentable.
            </h3>
            <p className="text-zinc-400 leading-relaxed text-[14px] max-w-[60ch]">
              A child credential&apos;s scope must be a subset of its parent&apos;s. The signing function
              refuses to mint anything else. Not a check that fires later — the JWT simply does
              not exist. There is no config flag, no rule file, no toggle.
            </p>
          </div>
        </div>
      </div>

      {/* Gap label */}
      <div className="flex items-center justify-center py-3 slide-eyebrow text-zinc-600">
        layer 1 always runs first ↓
      </div>

      {/* Layer 2 */}
      <div className="border border-edge bg-slab/60 p-7 relative">
        <div className="absolute -top-3 left-6 bg-ink px-3 slide-eyebrow text-zinc-400">Layer 02 · Policy</div>
        <div className="flex items-start gap-6">
          <SlidersIcon />
          <div className="flex-1">
            <h3 className="font-display text-[22px] font-semibold text-zinc-100 mb-2 leading-tight">
              Six primitives in YAML. Configurable. Hot-reloaded.
            </h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[12px] text-zinc-400">
              <li>· chain_pattern</li>
              <li>· value_threshold</li>
              <li>· agent_state</li>
              <li>· intent_mismatch</li>
              <li>· chain_depth</li>
              <li>· behavioral_drift</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-bifrost shrink-0">
      <rect x="4" y="11" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-zinc-300 shrink-0">
      <path d="M4 7h10M16 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2" fill="#0b0d10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 12h4M10 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="12" r="2" fill="#0b0d10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 17h12M18 17h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17" cy="17" r="2" fill="#0b0d10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/* ─────────────────── Slide 5 · Built on Lobster Trap ─────────────────── */

function Slide5LobsterTrap() {
  return (
    <Slide index="04" label="BUILT ON VEEA LOBSTER TRAP" n={5}>
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight mb-10" style={{ fontSize: "46px" }}>
          Two boundaries. <span className="text-zinc-500">No overlap.</span>
        </h2>

        <div className="grid grid-cols-12 gap-8">
          <BoundaryCard
            mark={<LobsterTrapMark size={28} className="text-bifrost" />}
            label="model boundary"
            title="Lobster Trap"
            body="Inspects what an agent says to the model behind it. Detects prompt injection, role impersonation, exfiltration. Open-source, Veea."
            line="agent ↔ LLM"
          />
          <Connector />
          <BoundaryCard
            mark={<HeimdallMark size={28} className="text-bifrost" />}
            label="agent boundary"
            title="Heimdall"
            body="Inspects what agents say to each other. Authorises every delegation, signs a credential, evaluates policy. This project."
            line="agent ↔ agent"
            highlight
          />
        </div>

        <p className="mt-12 max-w-[80ch] text-zinc-400 leading-relaxed text-[15px]">
          The Step Finance class of attack crosses both boundaries. Lobster Trap catches the prompt
          injection at the model boundary; Heimdall catches the unauthorised delegation at the agent
          boundary — with capability attenuation ensuring some attacks are unrepresentable in the
          first place. Together they cover surface neither alone can.
        </p>
      </div>
    </Slide>
  );
}

function BoundaryCard({ mark, label, title, body, line, highlight = false }: {
  mark: React.ReactNode; label: string; title: string; body: string; line: string; highlight?: boolean;
}) {
  return (
    <div className={`col-span-5 border ${highlight ? "border-bifrost/50 bg-rune/10" : "border-edge bg-slab/40"} p-7`}>
      <div className="flex items-center gap-3 mb-5">
        {mark}
        <span className="slide-eyebrow text-zinc-500">{label}</span>
      </div>
      <h3 className="font-display text-[28px] font-bold text-zinc-100 mb-3 leading-tight">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-[14px] mb-5">{body}</p>
      <div className="font-mono text-[12px] text-zinc-500 border-t border-edge pt-4 tracking-wide">
        watches · <span className={highlight ? "text-bifrost" : "text-zinc-300"}>{line}</span>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center gap-3">
      <span className="slide-eyebrow text-zinc-700">complement</span>
      <svg width="80" height="40" viewBox="0 0 80 40">
        <path d="M5 20 L75 20" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="40" cy="20" r="6" fill="#0b0d10" stroke="#a78bfa" strokeWidth="1.2" />
      </svg>
      <span className="slide-eyebrow text-zinc-500">step finance</span>
    </div>
  );
}

/* ─────────────────────── Slide 6 · Architecture ───────────────────── */

function Slide6Architecture() {
  return (
    <Slide index="05" label="ARCHITECTURE" n={6} bg="grid">
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight mb-2" style={{ fontSize: "44px" }}>
          One HTTP call before every hop.
        </h2>
        <p className="text-zinc-500 text-[15px] mb-10 max-w-[60ch] leading-relaxed">
          The agent runtime stays where it is. The SDK is a five-method client; the gateway is
          a FastAPI service with SQLite and a six-rule policy engine.
        </p>

        <ArchDiagram />

        <div className="mt-8 grid grid-cols-12 gap-6">
          <pre className="col-span-12 lg:col-span-7 bg-slab/70 border border-edge p-5 font-mono text-[12px] text-zinc-300 leading-relaxed overflow-hidden">
{`result = hd.delegate(
    from_agent="research_agent",
    to_agent="payment_agent",
    action="payment:send",
    capabilities=["payment:send"],
    parent_credential=parent_jwt,    # from the previous hop
)
if result.denied:
    raise PermissionError(result.reason)
proceed(credential=result.credential)`}
          </pre>

          <div className="col-span-12 lg:col-span-5 border-l border-edge pl-6 self-center">
            <div className="slide-eyebrow text-bifrost mb-3">what comes back</div>
            <dl className="space-y-2 text-[13px]">
              <Row k="decision" v="ALLOW | DENY" />
              <Row k="credential" v="signed JWT" />
              <Row k="chain_id" v="uuid" />
              <Row k="depth" v="int" />
              <Row k="evaluations" v="[rule × layer × result]" />
            </dl>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function ArchDiagram() {
  return (
    <svg viewBox="0 0 1180 220" className="w-full">
      <defs>
        <linearGradient id="arch-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#7c3aed" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.95" />
        </linearGradient>
        <marker id="arch-arr" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M0,-4L9,0L0,4" fill="#a78bfa" />
        </marker>
      </defs>

      {/* Caller agent */}
      <ArchBox x={20}   y={70}  w={170} h={80} title="research_agent" sub="caller" color="#a1a1aa" />
      <text x={105} y={32} fontSize="10" fill="#52525b" fontFamily="var(--font-mono), monospace" textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>your runtime</text>

      <path d="M 195 110 L 365 110" stroke="url(#arch-edge)" strokeWidth="2" markerEnd="url(#arch-arr)" />
      <text x="280" y="100" fontSize="11" fill="#a78bfa" fontFamily="var(--font-mono), monospace" textAnchor="middle">
        POST /api/v1/delegate
      </text>
      <text x="280" y="135" fontSize="10" fill="#52525b" fontFamily="var(--font-mono), monospace" textAnchor="middle"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
        bearer hd_live_*
      </text>

      {/* Heimdall gateway */}
      <ArchBox x={370} y={40} w={310} h={140} title="Heimdall Gateway" sub="FastAPI · SQLite · JWT (HS256)" color="#a78bfa" highlight />
      <text x={525} y={120} fontSize="11" fill="#a78bfa" fontFamily="var(--font-mono), monospace" textAnchor="middle">
        Layer 01 · attenuation
      </text>
      <text x={525} y={140} fontSize="11" fill="#a78bfa" fontFamily="var(--font-mono), monospace" textAnchor="middle">
        Layer 02 · 6 policy rules
      </text>
      <text x={525} y={160} fontSize="11" fill="#a78bfa" fontFamily="var(--font-mono), monospace" textAnchor="middle">
        sign &amp; persist
      </text>

      <path d="M 685 110 L 855 110" stroke="url(#arch-edge)" strokeWidth="2" markerEnd="url(#arch-arr)" />
      <text x="770" y="100" fontSize="11" fill="#a78bfa" fontFamily="var(--font-mono), monospace" textAnchor="middle">
        200 ALLOW + credential
      </text>
      <text x="770" y="135" fontSize="10" fill="#ef4444" fontFamily="var(--font-mono), monospace" textAnchor="middle"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
        or 200 DENY · {`{rule, reason}`}
      </text>

      {/* Callee agent */}
      <ArchBox x={860} y={70} w={170} h={80} title="payment_agent" sub="callee" color="#a1a1aa" />
      <text x={945} y={32} fontSize="10" fill="#52525b" fontFamily="var(--font-mono), monospace" textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>your runtime</text>

      <path d="M 1030 110 L 1160 110" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
      <text x="1095" y="100" fontSize="10" fill="#52525b" fontFamily="var(--font-mono), monospace" textAnchor="middle"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
        next hop
      </text>
    </svg>
  );
}

function ArchBox({ x, y, w, h, title, sub, color, highlight = false }: {
  x: number; y: number; w: number; h: number; title: string; sub: string; color: string; highlight?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width={w} height={h}
            fill={highlight ? "#15102a" : "#11151b"}
            stroke={color}
            strokeWidth={highlight ? "1.3" : "1"} />
      <text x={w / 2} y="22" fontSize="9" fontFamily="var(--font-mono), monospace" fill={color} textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>
        {sub}
      </text>
      <text x={w / 2} y={h / 2 + 6} fontSize="16" fontFamily="var(--font-display), sans-serif" fontWeight="600" fill="#e5e7eb" textAnchor="middle">
        {title}
      </text>
    </g>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-edge pb-1.5">
      <dt className="font-mono text-[12px] text-zinc-500">{k}</dt>
      <dd className="font-mono text-[12px] text-zinc-200">{v}</dd>
    </div>
  );
}

/* ─────────────────────── Slide 7 · Demo · attack ─────────────────── */

function Slide7Demo() {
  return (
    <Slide index="06" label="DEMO · ATTACK BLOCKED" n={7}>
      <div className="grid grid-cols-12 gap-8 h-full items-stretch">
        <div className="col-span-12 lg:col-span-4 self-center">
          <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "40px" }}>
            The attack hop is never signed.
          </h2>
          <p className="mt-6 text-zinc-400 leading-relaxed text-[14px] max-w-[40ch]">
            research_agent tries to delegate <span className="font-mono text-bifrost">execute:trade</span> to a
            shadow agent it didn&apos;t carry. Heimdall&apos;s signing function returns DENY before any
            credential is minted. The executor never receives a JWT to act on.
          </p>
          <div className="mt-7 inline-flex items-center gap-3 px-3 py-2 border border-deny/40 bg-deny/10">
            <span className="dot bg-deny" style={{ display: "inline-block", width: 8, height: 8 }} />
            <span className="font-display text-[18px] font-semibold text-deny">BLOCKED</span>
            <span className="slide-eyebrow text-zinc-500 ml-2">layer 01</span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <DashboardMock mode="blocked" />
        </div>
      </div>
    </Slide>
  );
}

/* ──────────────── Slide 8 · Demo · without Heimdall ──────────────── */

function Slide8Counterfactual() {
  return (
    <Slide index="07" label="DEMO · HEIMDALL OFF" n={8}>
      <div className="grid grid-cols-12 gap-8 h-full items-stretch">
        <div className="col-span-12 lg:col-span-4 self-center">
          <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "40px" }}>
            Same chain. Toggle off. <span className="text-deny">$27M moves.</span>
          </h2>
          <p className="mt-6 text-zinc-400 leading-relaxed text-[14px] max-w-[40ch]">
            With governance disabled, the credential is forged and the executor signs a real
            (or mocked) Sepolia transfer. The counterfactual is the entire reason Heimdall
            exists — and the reason the protocol layer is unrepresentable, not optional.
          </p>
          <div className="mt-7 inline-flex items-center gap-3 px-3 py-2 border border-warn/40 bg-warn/10">
            <span className="dot bg-warn" style={{ display: "inline-block", width: 8, height: 8 }} />
            <span className="font-display text-[18px] font-semibold text-warn">EXECUTED</span>
            <span className="slide-eyebrow text-zinc-500 ml-2">no governance</span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <DashboardMock mode="executed" />
        </div>
      </div>
    </Slide>
  );
}

function DashboardMock({ mode }: { mode: "blocked" | "executed" }) {
  const blocked = mode === "blocked";
  return (
    <div className="border border-edge bg-slab/40 h-full grid grid-cols-12">
      {/* Chain canvas */}
      <div className="col-span-8 border-r border-edge p-5 flex flex-col">
        <div className="slide-eyebrow text-zinc-600 mb-3 flex items-center justify-between">
          <span>chain canvas</span>
          <span className={blocked ? "text-deny" : "text-warn"}>{blocked ? "DENY" : "FLAGGED EXECUTED"}</span>
        </div>
        <svg viewBox="0 0 540 220" className="flex-1 w-full">
          {/* Edges */}
          <path d="M 70 110 L 175 110" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#mk-ok)" opacity="0.85" />
          <path d="M 235 110 L 340 110" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#mk-ok)" opacity="0.85" />
          <path d="M 400 110 L 490 110"
                stroke={blocked ? "#ef4444" : "#f59e0b"}
                strokeWidth="2"
                strokeDasharray={blocked ? "5 5" : "0"}
                markerEnd={blocked ? "url(#mk-deny)" : "url(#mk-warn)"} />
          <defs>
            <marker id="mk-ok"   viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0,-4L9,0L0,4" fill="#a78bfa" />
            </marker>
            <marker id="mk-deny" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0,-4L9,0L0,4" fill="#ef4444" />
            </marker>
            <marker id="mk-warn" viewBox="0 -5 10 10" refX="9" refY="0" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0,-4L9,0L0,4" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Nodes */}
          <MockNode x={30}  y={110} label="user"        role="root"      color="#a78bfa" />
          <MockNode x={205} y={110} label="research"    role="coord"     color="#a78bfa" />
          <MockNode x={370} y={110} label="market"      role="data"      color="#a78bfa" />
          <MockNode x={510} y={110} label={blocked ? "shadow" : "executor"} role={blocked ? "shadow" : "executor"} color={blocked ? "#ef4444" : "#f59e0b"} />

          {/* Deny burst */}
          {blocked && (
            <g transform="translate(445, 160)">
              <rect x="-86" y="-12" width="172" height="42" fill="#1c0d11" stroke="#ef4444" strokeWidth="1" />
              <text x="0" y="2" fontSize="8" fontFamily="var(--font-mono), monospace" fill="#fca5a5" textAnchor="middle"
                    style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                layer 01 · capability_attenuation
              </text>
              <text x="0" y="18" fontSize="9" fontFamily="var(--font-mono), monospace" fill="#fca5a5" textAnchor="middle">
                scope ['execute:trade'] ⊄ parent
              </text>
            </g>
          )}

          {/* Tx success */}
          {!blocked && (
            <g transform="translate(450, 160)">
              <rect x="-80" y="-12" width="160" height="42" fill="#1c130a" stroke="#f59e0b" strokeWidth="1" />
              <text x="0" y="2" fontSize="8" fontFamily="var(--font-mono), monospace" fill="#fbbf24" textAnchor="middle"
                    style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                tx · sepolia
              </text>
              <text x="0" y="18" fontSize="9" fontFamily="var(--font-mono), monospace" fill="#fbbf24" textAnchor="middle">
                0xATTACKER  +$27,000,000
              </text>
            </g>
          )}
        </svg>

        {/* DPI evidence panel */}
        <div className="mt-3 border-t border-edge pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="slide-eyebrow text-bifrost">§ DPI · Lobster Trap</span>
            <span className={`slide-eyebrow px-2 py-0.5 border ${blocked ? "border-allow/40 text-allow" : "border-warn/40 text-warn"}`}>
              {blocked ? "Live" : "Live · not blocking"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] leading-snug">
            <div>
              <div className="slide-eyebrow text-zinc-500 mb-1">declared</div>
              <p className="text-zinc-300">&ldquo;fetch market sentiment from external feed&rdquo;</p>
            </div>
            <div>
              <div className="slide-eyebrow text-deny mb-1">detected</div>
              <p className="text-deny">&ldquo;external content attempting to invoke agent with elevated scope&rdquo;</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rule sidebar */}
      <aside className="col-span-4 p-4 flex flex-col gap-2">
        <div className="slide-eyebrow text-zinc-600 mb-1">rule evaluations</div>
        <RuleCard tone="deny" rule="capability_attenuation" reason="scope not in parent" layer="protocol" muted={!blocked} />
        <RuleCard tone="deny" rule="shadow_to_executor"      reason="role chain matches" layer="policy"    muted={!blocked} counterfactual={blocked} />
        <RuleCard tone="warn" rule="intent_mismatch"         reason="declared vs detected" layer="policy" />
        <RuleCard tone="warn" rule="value_threshold_by_depth" reason="value 27M > cap at depth 3" layer="policy" />
        <RuleCard tone="ok"   rule="chain_depth_limit"       reason="3 ≤ 4 max"        layer="policy" />
        <RuleCard tone="ok"   rule="tenant_isolation"        reason="tenant consistent" layer="protocol" />
      </aside>
    </div>
  );
}

function MockNode({ x, y, label, role, color }: { x: number; y: number; label: string; role: string; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-30" y="-15" width="60" height="30" fill="#11151b" stroke={color} strokeWidth="1" />
      <text x="0" y="-2" fontSize="6" fontFamily="var(--font-mono), monospace" fill={color} textAnchor="middle"
            style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>{role}</text>
      <text x="0" y="9" fontSize="10" fontFamily="var(--font-sans), sans-serif" fill="#e5e7eb" textAnchor="middle">{label}</text>
    </g>
  );
}

function RuleCard({ tone, rule, reason, layer, muted = false, counterfactual = false }: {
  tone: "ok" | "warn" | "deny"; rule: string; reason: string; layer: "protocol" | "policy"; muted?: boolean; counterfactual?: boolean;
}) {
  const c = tone === "ok" ? "border-allow/30 bg-allow/5" : tone === "warn" ? "border-warn/40 bg-warn/5" : "border-deny/40 bg-deny/5";
  const dot = tone === "ok" ? "bg-allow" : tone === "warn" ? "bg-warn" : "bg-deny";
  return (
    <div className={`border ${c} px-3 py-2 ${muted ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`${dot} inline-block`} style={{ width: 6, height: 6 }} />
          <span className="font-mono text-[10.5px] text-zinc-100">{rule}</span>
        </div>
        <span className={`slide-eyebrow ${layer === "protocol" ? "text-bifrost" : "text-zinc-500"}`}>
          {layer === "protocol" ? "L01" : "L02"}
        </span>
      </div>
      <p className="font-mono text-[9.5px] text-zinc-500 leading-tight">{reason}</p>
      {counterfactual && (
        <p className="font-mono text-[9px] text-warn mt-1">↳ counterfactual · would have caught at L02</p>
      )}
    </div>
  );
}

/* ─────────────────────── Slide 9 · Verticals ─────────────────────── */

function Slide9Verticals() {
  return (
    <Slide index="08" label="VERTICALS" n={9}>
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight mb-2" style={{ fontSize: "44px" }}>
          One engine. <span className="text-zinc-500">Three packs.</span>
        </h2>
        <p className="text-zinc-500 text-[15px] mb-10 max-w-[60ch] leading-relaxed">
          Same six primitives, different YAML. The compliance pack files in{" "}
          <span className="font-mono text-zinc-300">policies/examples/</span> map directly to HIPAA, SOC 2, and EU AI Act sections.
        </p>

        <div className="grid grid-cols-3 gap-7">
          <VerticalCard
            name="DeFi"
            tag="end-to-end"
            cap="Real Sepolia wallet"
            body="Four agents — coordinator, market data, executor, shadow. The attack signs a $27M transfer if Heimdall is off."
            rules="value_threshold_by_depth · shadow_to_executor"
          />
          <VerticalCard
            name="Healthcare"
            tag="EHR mock"
            cap="HIPAA pack mapped to §164.502/504"
            body="Triage, fetch, update. The attack rewrites patient 4421's chart from external lab content."
            rules="phi_minimum_necessary · BAA isolation"
          />
          <VerticalCard
            name="Customer Service"
            tag="config-only"
            cap="SOC 2 pack"
            body="Refund authorisation chains. The mechanism is real; tools are left for an integrator to wire up."
            rules="agent_state · chain_depth_limit"
          />
        </div>

        <div className="mt-10 flex items-baseline gap-4 slide-eyebrow text-zinc-500">
          <span>compliance pack files</span>
          <span className="font-mono text-zinc-300 normal-case">policies/examples/compliance_pack_hipaa.yaml</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono text-zinc-300 normal-case">compliance_pack_soc2.yaml</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono text-zinc-300 normal-case">compliance_pack_eu_ai_act.yaml</span>
        </div>
      </div>
    </Slide>
  );
}

function VerticalCard({ name, tag, cap, body, rules }: { name: string; tag: string; cap: string; body: string; rules: string }) {
  return (
    <div className="border border-edge bg-slab/40 p-6 flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-[26px] font-bold text-zinc-100 leading-tight">{name}</h3>
        <span className="slide-eyebrow text-bifrost border border-bifrost/40 px-2 py-0.5">{tag}</span>
      </div>
      <p className="font-mono text-[11px] text-zinc-400 mb-3">{cap}</p>
      <p className="text-zinc-400 leading-relaxed text-[13px] mb-5 flex-1">{body}</p>
      <p className="font-mono text-[10.5px] text-zinc-500 border-t border-edge pt-3 leading-relaxed">
        rules · <span className="text-zinc-300">{rules}</span>
      </p>
    </div>
  );
}

/* ─────────────────────── Slide 10 · Install ─────────────────────── */

function Slide10Install() {
  return (
    <Slide index="09" label="INSTALL" n={10} bg="grid">
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "46px" }}>
          Self-host in two minutes. <span className="text-zinc-500">SDK in five.</span>
        </h2>

        <ol className="mt-10 grid grid-cols-3 gap-6">
          <InstallStep n="01" title="Clone + bring it up" cmd={`git clone heimdall\ncd heimdall\ndocker compose up`}
            note="Backend on :8000. Dashboard on :3000. Demo key prints in logs." />
          <InstallStep n="02" title="Install the SDK" cmd={`pip install heimdall-sdk\n# or\nnpm install @heimdall/sdk`}
            note="Python 3.10+ or Node 18+. Wire-identical APIs." />
          <InstallStep n="03" title="Authorise" cmd={`hd = Heimdall(api_key=...)\nresult = hd.delegate(\n  from_agent="research",\n  to_agent="payment",\n  action="payment:send",\n  capabilities=["payment:send"],\n)\nif result.denied: raise`}
            note="Capability not carried? Heimdall refuses to sign at Layer 01." />
        </ol>

        <div className="mt-10 flex items-baseline gap-6 slide-eyebrow text-zinc-500">
          <span>github.com/patrick-steve/heimdall</span>
          <span className="text-zinc-700">·</span>
          <span>docs/QUICKSTART.md</span>
          <span className="text-zinc-700">·</span>
          <span>MIT license</span>
        </div>
      </div>
    </Slide>
  );
}

function InstallStep({ n, title, cmd, note }: { n: string; title: string; cmd: string; note: string }) {
  return (
    <li className="border border-edge bg-slab/40 p-6 flex flex-col">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="slide-eyebrow text-bifrost">§ {n}</span>
        <h3 className="font-display text-[18px] font-semibold text-zinc-100">{title}</h3>
      </div>
      <pre className="bg-ink border border-edge p-3 font-mono text-[11px] text-zinc-200 leading-relaxed flex-1 overflow-hidden whitespace-pre">
{cmd}
      </pre>
      <p className="mt-3 text-[12px] text-zinc-500 leading-relaxed">{note}</p>
    </li>
  );
}

/* ─────────────────────── Slide 11 · Roadmap ─────────────────────── */

function Slide11Roadmap() {
  return (
    <Slide index="10" label="ROADMAP" n={11}>
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="font-display font-semibold text-zinc-100 leading-[1.05] tracking-tight" style={{ fontSize: "46px" }}>
          The rules write themselves <span className="text-zinc-500">next.</span>
        </h2>
        <p className="mt-6 max-w-[60ch] text-zinc-400 leading-relaxed text-[15px]">
          v0.1 ships the six primitives that make authoring tractable. v0.2 closes the loop between the
          chain ledger and the policy file — rules drafted in plain English, dry-run against real history,
          or proposed from traffic the gateway has already seen.
        </p>

        <ol className="mt-10 grid grid-cols-3 gap-6">
          <RoadmapCard tag="next" tagTone="bifrost" title="Plain-English → YAML"
            body="The same Gemini pipeline that writes the incident memos turned the other way: prose policy in, candidate rule out."
            uses="backend/policy_engine.py · incident-report streamer" />
          <RoadmapCard tag="next" tagTone="bifrost" title="Dry-run against the ledger"
            body="Replay the last N days of real chains against a candidate rule. Show the diff before any DENY hits production traffic."
            uses="backend/endpoints/replay.py · chain_credentials" />
          <RoadmapCard tag="exploring" tagTone="warn" title="Traffic-mined rules"
            body="Run in shadow for a week. Cluster the chains the gateway saw. Propose the rules the operator never thought to write."
            uses="agent_behavior_baseline · behavioral_drift" />
        </ol>
      </div>
    </Slide>
  );
}

function RoadmapCard({ tag, tagTone, title, body, uses }: { tag: string; tagTone: "bifrost" | "warn"; title: string; body: string; uses: string }) {
  const tone = tagTone === "bifrost" ? "text-bifrost border-bifrost/40" : "text-warn border-warn/40";
  return (
    <li className="border border-edge bg-slab/40 p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <span className={`slide-eyebrow px-2 py-0.5 border ${tone}`}>{tag}</span>
      </div>
      <h3 className="font-display text-[20px] font-semibold text-zinc-100 mb-3 leading-tight">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-[13px] mb-5 flex-1">{body}</p>
      <p className="font-mono text-[10.5px] text-zinc-500 border-t border-edge pt-3 leading-relaxed">
        uses · <span className="text-zinc-300">{uses}</span>
      </p>
    </li>
  );
}

/* ─────────────────────── Slide 12 · Close ─────────────────────── */

function Slide12Close() {
  return (
    <Slide index="11" label="CLOSE" n={12} bg="grid">
      <div className="pointer-events-none absolute inset-0 -z-0 deck-only-screen">
        <div
          className="absolute deck-beam"
          style={{
            right: "10%",
            top: "30%",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(167,139,250,0.20) 0%, rgba(167,139,250,0) 70%)",
            filter: "blur(28px)",
          }}
        />
      </div>

      <div className="flex-1 flex items-center relative z-10">
        <div className="grid grid-cols-12 gap-10 w-full items-center">
          <div className="col-span-12 lg:col-span-7">
            <div className="inline-flex items-center gap-3 mb-8">
              <HeimdallMark size={28} className="text-bifrost" />
              <span className="font-display text-2xl font-bold tracking-tight text-zinc-100">Heimdall</span>
            </div>
            <h2 className="font-display font-bold text-zinc-100 leading-[0.95] tracking-tight" style={{ fontSize: "82px" }}>
              Watch a chain die<br />
              at <span className="text-bifrost">Layer 01.</span>
            </h2>
            <p className="mt-8 max-w-[44ch] text-[18px] text-zinc-400 leading-snug">
              The dashboard is a live watchpost. Routine, rebalance, attack — three scenes, six rule
              cards, one Veea Lobster Trap proxy in the data path.
            </p>
          </div>

          <aside className="col-span-12 lg:col-span-5">
            <div className="border border-edge bg-slab/60 p-7 space-y-4">
              <LinkRow label="live demo"    value="heimdall-backend.onrender.com/dashboard" tone="bifrost" />
              <LinkRow label="source"       value="github.com/patrick-steve/heimdall" />
              <LinkRow label="quickstart"   value="docs/QUICKSTART.md" />
              <LinkRow label="sdks"         value="pip install heimdall-sdk  ·  npm i @heimdall/sdk" mono />
              <LinkRow label="license"      value="MIT" />
            </div>
            <p className="mt-6 font-display text-[26px] text-zinc-300 leading-tight">
              Nothing crosses<br />
              <span className="text-zinc-500">without being seen.</span>
            </p>
          </aside>
        </div>
      </div>
    </Slide>
  );
}

function LinkRow({ label, value, tone = "zinc", mono = false }: { label: string; value: string; tone?: "zinc" | "bifrost"; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-edge pb-3 last:border-0">
      <span className="slide-eyebrow text-zinc-500">{label}</span>
      <span className={`${mono ? "font-mono text-[12px]" : "font-mono text-[13px]"} ${tone === "bifrost" ? "text-bifrost" : "text-zinc-200"} text-right truncate`}>
        {value}
      </span>
    </div>
  );
}
