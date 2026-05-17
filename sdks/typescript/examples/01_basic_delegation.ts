/**
 * Basic two-hop delegation.
 *
 * Demonstrates the happy path: user → research_agent → search_agent.
 * Both hops succeed because each child's capabilities are a subset of
 * its parent's.
 *
 * Usage:
 *   HEIMDALL_API_KEY=hd_test_... npx tsx examples/01_basic_delegation.ts
 */
import { Heimdall, isAllowed } from "../src/index";

async function main(): Promise<void> {
  const apiKey = process.env.HEIMDALL_API_KEY;
  if (!apiKey) {
    throw new Error("Set HEIMDALL_API_KEY (your hd_test_... or hd_live_... key).");
  }
  const baseUrl = process.env.HEIMDALL_URL ?? "http://localhost:8000";

  const hd = new Heimdall({ apiKey, baseUrl });

  const first = await hd.delegate({
    from_agent: "user",
    to_agent: "research_agent",
    action: "read:data",
    capabilities: ["read:data", "read:market"],
    declared_intent: "User asked: what's Tesla's Q4 outlook?",
  });
  console.log(
    `hop 1: ${first.decision} (depth=${first.depth}, chain=${first.chain_id.slice(0, 8)})`,
  );
  if (!isAllowed(first)) {
    throw new Error("first hop should be allowed");
  }

  const second = await hd.delegate({
    parent_credential: first.credential,
    from_agent: "research_agent",
    to_agent: "search_agent",
    action: "read:market",
    capabilities: ["read:market"],
    declared_intent: "Fetching Tesla earnings call transcript",
  });
  console.log(`hop 2: ${second.decision} (depth=${second.depth})`);
  if (!isAllowed(second)) {
    throw new Error("second hop should be allowed — scope shrinks");
  }

  console.log(`\nchain ${first.chain_id.slice(0, 8)} authorised through 2 hops.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
