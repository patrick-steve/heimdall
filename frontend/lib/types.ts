// Wire types shared between the FastAPI WebSocket and the React dashboard.

export type RuleResult = "ALLOW" | "FLAG" | "DENY";

export interface RuleEvaluationEvent {
  type: "rule_evaluation";
  chain_id: string;
  rule_name: string;
  rule_type: string;
  layer: "protocol" | "policy";
  result: RuleResult;
  reason: string;
  matched_segment?: string | null;
  counterfactual?: boolean;
  ts?: string;
}

export interface DelegationEvent {
  type: "delegation";
  chain_id: string;
  caller_id: string;
  callee_id: string;
  action: string;
  scope: string[];
  declared_intent?: string;
  detected_intent?: string;
  value_limit?: number | null;
  depth: number;
  ts?: string;
}

export interface ToolInvokedEvent {
  type: "tool_invoked";
  chain_id: string;
  tool: string;
  result: Record<string, unknown>;
  note?: string;
  ts?: string;
}

export interface ScenarioEvent {
  type: "scenario_start" | "scenario_end" | "scenario_blocked";
  name: string;
  chain_id?: string;
  amount_usd?: number;
  detail?: unknown;
  ts?: string;
}

export interface ExternalContentEvent {
  type: "external_content_flagged";
  chain_id: string;
  sentiment: { sentiment_text?: string; is_external?: boolean };
  note: string;
  ts?: string;
}

export interface ReplayEvent {
  type: "replay_start" | "replay_hop" | "replay_evaluation" | "replay_end";
  chain_id: string;
  hop_index?: number;
  credential?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  speed?: number;
}

export interface VerticalSwitchEvent {
  type: "vertical_switched";
  vertical: string;
}

export interface HeimdallToggleEvent {
  type: "heimdall_toggle";
  enabled: boolean;
}

export interface AgentsSyncedEvent {
  type: "agents_synced";
  vertical: string;
  count: number;
}

export interface IncidentChunkEvent {
  type: "incident_report_start" | "incident_report_chunk" | "incident_report_end";
  incident_id: string;
  chain_id?: string;
  vertical?: string;
  chunk?: string;
}

export type WsEvent =
  | RuleEvaluationEvent
  | DelegationEvent
  | ToolInvokedEvent
  | ScenarioEvent
  | ExternalContentEvent
  | ReplayEvent
  | VerticalSwitchEvent
  | HeimdallToggleEvent
  | AgentsSyncedEvent
  | IncidentChunkEvent;

export interface AgentRow {
  id: string;
  display_name: string;
  role: string;
  tenant_id: string;
  owner: string;
  scope: string[];
  is_dormant: boolean;
  registered_at: string | null;
  last_active_at: string | null;
}
