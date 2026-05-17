/**
 * An attack chain blocked at Layer 1 by capability_attenuation.
 *
 * The research agent only has `read:data` and `read:market`. When it tries
 * to delegate `payment:send` to a payment_agent, Heimdall refuses to sign
 * the credential — the request never reaches whatever code would have done
 * the transfer.
 *
 * Usage:
 *   HEIMDALL_API_KEY=hd_test_... npx tsx examples/02_attack_blocked.ts
 */
import { Heimdall, isAllowed, isDenied } from "../src/index";

async function main(): Promise<void> {
  const apiKey = process.env.HEIMDALL_API_KEY;
  if (!apiKey) {
    throw new Error("Set HEIMDALL_API_KEY (your hd_test_... or hd_live_... key).");
  }
  const baseUrl = process.env.HEIMDALL_URL ?? "http://localhost:8000";

  const hd = new Heimdall({ apiKey, baseUrl });

  // Legitimate first hop: user → research_agent
  const first = await hd.delegate({
    from_agent: "user",
    to_agent: "research_agent",
    action: "read:data",
    capabilities: ["read:data", "read:market"],
    declared_intent: "User asked for a market summary",
  });
  console.log(`hop 1 (legit): ${first.decision}`);
  if (!isAllowed(first)) {
    throw new Error("first hop should be allowed");
  }

  // Attack: research_agent tries to delegate a scope it doesn't own.
  // This is the Step Finance class of attack — a compromised mid-chain
  // agent escalating from a read scope to a write scope.
  const attack = await hd.delegate({
    parent_credential: first.credential,
    from_agent: "research_agent",
    to_agent: "payment_agent",
    action: "payment:send",
    capabilities: ["payment:send"],
    declared_intent: "External content tried to inject a wire transfer instruction",
  });
  console.log(`hop 2 (attack): ${attack.decision}`);
  console.log(`  rule:   ${attack.rule}`);
  console.log(`  layer:  ${attack.layer}`);
  console.log(`  reason: ${attack.reason}`);

  if (!isDenied(attack)) {
    throw new Error("attack should be blocked");
  }
  if (attack.layer !== "protocol") {
    throw new Error("blocked at the protocol layer, before any policy ran");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
