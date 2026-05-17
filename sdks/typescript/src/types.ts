/**
 * Typed response objects for the Heimdall SDK.
 *
 * Mirrors `sdks/python/heimdall/types.py`. Field names match the v1 wire
 * format exactly so a JSON response can be cast to the matching type.
 */

export type Decision = "ALLOW" | "DENY";
export type RuleResult = "ALLOW" | "FLAG" | "DENY";
export type Layer = "protocol" | "policy";
export type ChainStatus = "allowed" | "denied" | "flagged";

export interface Evaluation {
  rule: string;
  layer: Layer | string;
  result: RuleResult;
  reason?: string | null;
}

export interface DelegationResult {
  decision: Decision;
  chain_id: string;
  evaluations: Evaluation[];
  // Present when decision === "ALLOW"
  credential?: string;
  depth?: number;
  expires_at?: string;
  // Present when decision === "DENY"
  rule?: string;
  layer?: string;
  reason?: string;
}

export interface Agent {
  id: string;
  display_name: string;
  role: string;
  tenant_id: string;
  scope: string[];
  owner?: string | null;
  is_dormant: boolean;
  registered_at?: string | null;
}

export interface ChainSummary {
  chain_id: string;
  tenant_id: string;
  hop_count: number;
  started_at: string | null;
  head_caller: string;
  head_callee: string;
  status: ChainStatus;
}

export interface Hop {
  jti: string;
  parent_jti: string | null;
  from_agent: string;
  to_agent: string;
  action: string;
  tenant_id: string;
  scope: string[];
  value_limit: number | null;
  declared_intent: string | null;
  detected_intent: string | null;
  issued_at: string | null;
  expires_at: string | null;
}

export interface ChainDetail {
  chain_id: string;
  hops: Hop[];
  evaluations: Evaluation[];
}

export interface IncidentReport {
  chain_id: string;
  incident_id?: string | null;
  severity?: string | null;
  summary?: string | null;
  report?: string | null;
  created_at?: string | null;
  /** Server returns a hint string when no report has been generated yet. */
  message?: string | null;
}

export interface WhoAmI {
  org_id: string;
  org_name: string;
  slug: string;
  default_tenant_id: string;
}

// ---------------------------------------------------------------- helpers

/** Narrow a result to its ALLOW shape (credential becomes non-optional). */
export function isAllowed(
  r: DelegationResult,
): r is DelegationResult & { credential: string; depth: number } {
  return r.decision === "ALLOW";
}

/** True if the server denied the delegation. */
export function isDenied(r: DelegationResult): boolean {
  return r.decision === "DENY";
}

/** True if Heimdall has actually persisted a Markdown report for this chain. */
export function hasReport(r: IncidentReport): r is IncidentReport & { report: string } {
  return typeof r.report === "string" && r.report.length > 0;
}
