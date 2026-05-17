/**
 * @heimdall/sdk — runtime governance for AI agent delegation chains.
 *
 * Quick start:
 *
 *     import { Heimdall, isAllowed } from "@heimdall/sdk";
 *
 *     const hd = new Heimdall({
 *       apiKey: process.env.HEIMDALL_API_KEY!,
 *       baseUrl: "http://localhost:8000",
 *     });
 *
 *     const result = await hd.delegate({
 *       from_agent: "research_agent",
 *       to_agent: "payment_agent",
 *       action: "payment:send",
 *       capabilities: ["payment:send"],
 *     });
 *
 *     if (isAllowed(result)) {
 *       // pass result.credential to the next hop
 *     } else {
 *       console.warn("blocked by", result.rule, "-", result.reason);
 *     }
 */
export { Heimdall } from "./client";
export type {
  DelegateInput,
  HeimdallOptions,
  ListChainsOptions,
  RegisterAgentInput,
} from "./client";
export {
  AuthenticationError,
  HeimdallError,
  InvalidPayloadError,
  NetworkError,
  NotFoundError,
} from "./errors";
export type {
  Agent,
  ChainDetail,
  ChainStatus,
  ChainSummary,
  Decision,
  DelegationResult,
  Evaluation,
  Hop,
  IncidentReport,
  Layer,
  RuleResult,
  WhoAmI,
} from "./types";
export { hasReport, isAllowed, isDenied } from "./types";
