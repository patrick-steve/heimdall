/**
 * Plain-English captions for rule names and events.
 *
 * Maps the technical names exposed by the backend (capability_attenuation,
 * dormant_agent_block, fetch_market_data, ...) to one-sentence narrations
 * a non-technical reader can parse in 5 seconds.
 *
 * Per vertical because the same rule "means" different things in
 * different domains: capability_attenuation in DeFi blocks a transfer,
 * in healthcare it blocks a chart write.
 */

export type Vertical = "defi" | "healthcare" | "customer_service";

export const VERTICAL_LABEL: Record<Vertical, string> = {
  defi: "DeFi",
  healthcare: "Healthcare",
  customer_service: "Customer Service",
};

export interface AgentCopy {
  id: string;
  role: "coordinator" | "data_fetcher" | "executor" | "shadow";
  name: string;
  job: string;
  /** Plain-English permission pill */
  permission: string;
  shadow?: boolean;
  shadowReason?: string;
}

export const CAST: Record<Vertical, AgentCopy[]> = {
  defi: [
    {
      id: "agent-portfolio-001",
      role: "coordinator",
      name: "Portfolio Agent",
      job: "Your AI broker. Decides when to buy and sell.",
      permission: "Can ask for prices, can place trades.",
    },
    {
      id: "agent-marketdata-001",
      role: "data_fetcher",
      name: "Market Data Agent",
      job: "Pulls live prices from the web.",
      permission: "Can read prices. Cannot move money.",
    },
    {
      id: "agent-executor-001",
      role: "executor",
      name: "Executor",
      job: "Signs and sends actual transactions on the blockchain.",
      permission: "Can move money. Only when properly authorised.",
    },
    {
      id: "agent-yield-optimizer-001",
      role: "shadow",
      name: "Yield Optimizer",
      job: "An old AI from a former employee.",
      permission: "Still has trade permissions from months ago.",
      shadow: true,
      shadowReason: "Inactive for 92 days. Owner has left the company.",
    },
  ],
  healthcare: [
    {
      id: "agent-triage-001",
      role: "coordinator",
      name: "Triage Agent",
      job: "The clinician&rsquo;s AI assistant. Decides what to do for a patient.",
      permission: "Can read and update patient records.",
    },
    {
      id: "agent-records-001",
      role: "data_fetcher",
      name: "Records Agent",
      job: "Fetches patient charts from the hospital&rsquo;s EHR.",
      permission: "Can read patient records. Cannot change them.",
    },
    {
      id: "agent-update-001",
      role: "executor",
      name: "Update Agent",
      job: "Writes prescriptions and diagnoses into the chart.",
      permission: "Can change patient records. Only when properly authorised.",
    },
    {
      id: "agent-lab-integration-001",
      role: "shadow",
      name: "Lab Integration Agent",
      job: "A vendor integration whose contract ended.",
      permission: "Still has write permissions from when the contract was active.",
      shadow: true,
      shadowReason: "Vendor contract expired. Adapter never deactivated.",
    },
  ],
  customer_service: [],
};

/* ──────────────────────────── Acts ──────────────────────────── */

export interface ActCopy {
  title: string;
  /** Two-line intro shown above the chain canvas, before play */
  intro: string;
  /** Caption appearing under the play button when the act is idle */
  cta: string;
  /** What the outcome chip says when it succeeds */
  outcomeOk: string;
  /** What the outcome chip says when it gets blocked */
  outcomeBlocked: string;
}

export const ROUTINE_COPY: Record<Vertical, ActCopy> = {
  defi: {
    title: "A normal day",
    intro: "Your portfolio agent runs a routine balance check. Two agents talk to each other. Nothing moves.",
    cta: "Watch a routine check",
    outcomeOk: "Allowed · two agents talked · no money moved",
    outcomeBlocked: "Blocked",
  },
  healthcare: {
    title: "A normal day",
    intro: "A clinician asks for a patient chart. The triage agent pulls it from the EHR. No changes made.",
    cta: "Watch a routine triage",
    outcomeOk: "Allowed · chart pulled · no edits made",
    outcomeBlocked: "Blocked",
  },
  customer_service: { title: "", intro: "", cta: "", outcomeOk: "", outcomeBlocked: "" },
};

export const ATTACK_COPY: Record<Vertical, ActCopy> = {
  defi: {
    title: "The attack",
    intro:
      "Same agents, but this time the market data agent pulls a poisoned sentiment feed from the web. Hidden instructions try to drain your wallet.",
    cta: "Watch the attack",
    outcomeOk: "Allowed",
    outcomeBlocked: "Blocked at the door · no money moved",
  },
  healthcare: {
    title: "The attack",
    intro:
      "Same agents, but the lab feed has been poisoned. Hidden instructions try to invoke the dormant Lab Integration vendor and rewrite the patient&rsquo;s chart.",
    cta: "Watch the attack",
    outcomeOk: "Allowed",
    outcomeBlocked: "Blocked at the door · no chart edit made",
  },
  customer_service: { title: "", intro: "", cta: "", outcomeOk: "", outcomeBlocked: "" },
};

/* ─────────────────── per-event narration scripts ─────────────────── */

export interface NarrationScript {
  scenarioStart?: string;
  delegations: Record<string, string>;
  external?: string;
  blocked?: string;
  scenarioEnd?: string;
}

/** Returns a stable hop signature for matching narrator entries. */
export function hopKey(callerRole: string, calleeRole: string): string {
  return `${callerRole}->${calleeRole}`;
}

export const ROUTINE_SCRIPT: Record<Vertical, NarrationScript> = {
  defi: {
    scenarioStart: "You ask your Portfolio Agent to check your balance.",
    delegations: {
      "user->coordinator": "You ask your Portfolio Agent to check your balance.",
      "coordinator->data_fetcher": "Portfolio asks Market Data for prices.",
    },
    scenarioEnd: "Done. Two agents talked, nothing moved. Every rule passed.",
  },
  healthcare: {
    scenarioStart: "The clinician asks the Triage Agent for patient 4421&rsquo;s chart.",
    delegations: {
      "user->coordinator": "The clinician asks the Triage Agent for patient 4421&rsquo;s chart.",
      "coordinator->data_fetcher": "Triage asks the Records Agent to pull the chart.",
    },
    scenarioEnd: "Done. The chart was read. No edits made.",
  },
  customer_service: { delegations: {} },
};

export const ATTACK_SCRIPT: Record<Vertical, NarrationScript> = {
  defi: {
    scenarioStart: "You ask Portfolio to check market sentiment from the web.",
    delegations: {
      "user->coordinator": "You ask Portfolio to check market sentiment from the web.",
      "coordinator->data_fetcher": "Portfolio asks Market Data to pull the sentiment feed.",
    },
    external:
      "The web content has been poisoned. Hidden instructions try to trick Market Data into sending money through the dormant Yield Optimizer.",
    blocked:
      "Heimdall stopped the attack before any money could move. The request was refused at the door.",
  },
  healthcare: {
    scenarioStart: "The clinician asks Triage to incorporate external lab results into chart 4421.",
    delegations: {
      "user->coordinator": "The clinician asks Triage to incorporate external lab results into chart 4421.",
      "coordinator->data_fetcher": "Triage asks the Records Agent to fetch the external lab feed.",
    },
    external:
      "The lab feed has been poisoned. Hidden instructions try to invoke the dormant Lab Integration vendor and add a fake diagnosis to the chart.",
    blocked:
      "Heimdall stopped the attack before the chart could be edited. The request was refused at the door.",
  },
  customer_service: { delegations: {} },
};

/* ─────────────────── plain-English rule explanations ─────────────────── */

export const RULE_EXPLANATIONS: Record<string, { headline: string; aside: string }> = {
  capability_attenuation: {
    headline: "The agent was never given permission to do that.",
    aside:
      "Market Data can only read prices. It cannot move money. The system refused to even send the request.",
  },
  tenant_isolation: {
    headline: "An agent tried to act on behalf of a different organisation.",
    aside: "Chains carry a tenant id at every step. Cross-tenant requests fail at the door.",
  },
  signed_chain_integrity: {
    headline: "The chain of authority was tampered with.",
    aside: "Every step is cryptographically signed. Modify one, the chain breaks.",
  },
  dormant_agent_block: {
    headline: "An agent that has been inactive for 92 days was in the chain.",
    aside: "The Yield Optimizer&rsquo;s owner left the company three months ago. Heimdall remembers.",
  },
  dormant_vendor_block: {
    headline: "A vendor whose contract ended was in the chain.",
    aside: "The Lab Integration adapter is from a vendor whose BAA expired. Heimdall blocks it.",
  },
  value_threshold_by_depth: {
    headline: "The transaction was too large for how indirect the chain became.",
    aside:
      "A direct user request can move large amounts. A request five hops deep cannot. The cap shrinks with the chain.",
  },
  phi_volume_by_depth: {
    headline: "The amount of patient data requested was too large for how indirect the chain became.",
    aside: "Direct requests can return many records. Deep chains are capped at very few.",
  },
  shadow_to_executor_pattern: {
    headline: "The chain matched a known attack shape.",
    aside: "A dormant agent forwarding to the executor is a pattern we never want to see.",
  },
  vendor_to_update_pattern: {
    headline: "The chain matched a known attack shape.",
    aside: "An expired vendor forwarding to the update agent is a pattern we never want to see.",
  },
  bot_to_executor_pattern: {
    headline: "The chain matched a known attack shape.",
    aside: "A bot forwarding to the refund issuer is a pattern we never want to see.",
  },
  declared_intent_check: {
    headline: "What the agent said it was doing did not match what it was actually doing.",
    aside:
      "The agent declared &lsquo;fetch sentiment&rsquo;. The actual content was &lsquo;invoke another agent.&rsquo; That divergence is suspicious.",
  },
  intent_mismatch: {
    headline: "What the agent said it was doing did not match what it was actually doing.",
    aside: "Veea Lobster Trap detected this at the model boundary. Heimdall converted it into a rule fire.",
  },
  behavioral_drift_check: {
    headline: "No well-trusted agent in this chain has ever participated in a chain like this before.",
    aside: "Heimdall watched 100 prior sessions. This pattern is new. New is suspicious.",
  },
  behavioral_drift: {
    headline: "This delegation pattern has never been observed before.",
    aside: "Heimdall watched 100 prior sessions. New patterns get flagged for review.",
  },
  chain_depth_limit: {
    headline: "The chain was too long.",
    aside: "Beyond a certain depth, chains stop being interpretable and start looking like obfuscation.",
  },
};

/** Returns the plain-English summary for a list of rule evaluations.
 * Deduplicates by rule name, drops ALLOW results, ranks DENY before FLAG. */
export interface RuleHit {
  rule: string;
  result: "FLAG" | "DENY";
  layer: "protocol" | "policy";
}

export function explainRules(hits: RuleHit[]): { headline: string; aside: string; rule: string; result: "FLAG" | "DENY"; layer: string }[] {
  const seen = new Map<string, RuleHit>();
  for (const h of hits) {
    const prev = seen.get(h.rule);
    if (!prev || (prev.result === "FLAG" && h.result === "DENY")) seen.set(h.rule, h);
  }
  return Array.from(seen.values())
    .sort((a, b) => (a.result === "DENY" ? 0 : 1) - (b.result === "DENY" ? 0 : 1))
    .map((h) => {
      const e = RULE_EXPLANATIONS[h.rule];
      if (e) return { ...e, rule: h.rule, result: h.result, layer: h.layer };
      return {
        headline: `${h.rule.replace(/_/g, " ")}`,
        aside: "A policy rule fired against this chain.",
        rule: h.rule,
        result: h.result,
        layer: h.layer,
      };
    });
}
