/**
 * Iterate the chain ledger and pull an incident report.
 *
 * After running the other examples to populate some chains, this script
 * shows how to retrieve them and inspect what fired.
 *
 * Usage:
 *   HEIMDALL_API_KEY=hd_test_... npx tsx examples/03_chain_audit.ts
 */
import { Heimdall, hasReport } from "../src/index";

async function main(): Promise<void> {
  const apiKey = process.env.HEIMDALL_API_KEY;
  if (!apiKey) {
    throw new Error("Set HEIMDALL_API_KEY (your hd_test_... or hd_live_... key).");
  }
  const baseUrl = process.env.HEIMDALL_URL ?? "http://localhost:8000";

  const hd = new Heimdall({ apiKey, baseUrl });

  const chains = await hd.listChains({ limit: 10 });
  console.log(`${chains.length} recent chain(s):\n`);
  for (const c of chains) {
    const status = c.status.padStart(7);
    console.log(
      `  [${status}] ${c.chain_id.slice(0, 8)}  ${c.hop_count} hop(s)  ${c.head_caller} -> ${c.head_callee}`,
    );
  }
  if (chains.length === 0) return;

  const target = chains.find((c) => c.status === "denied") ?? chains[0]!;
  const detail = await hd.getChain(target.chain_id);
  console.log(`\nchain ${target.chain_id.slice(0, 8)} (${target.status}):`);
  for (const hop of detail.hops) {
    console.log(
      `  hop: ${hop.from_agent} -> ${hop.to_agent}  action=${hop.action}  scope=${JSON.stringify(hop.scope)}`,
    );
  }
  for (const ev of detail.evaluations) {
    const mark = ev.result === "ALLOW" ? "ok " : ev.result === "FLAG" ? "!  " : "x  ";
    const layer = (ev.layer ?? "").padStart(8);
    console.log(`  ${mark} [${layer}] ${ev.rule.padEnd(28)} ${ev.reason ?? ""}`);
  }

  const report = await hd.getAudit(target.chain_id);
  if (hasReport(report)) {
    console.log(`\nincident report (severity=${report.severity}):`);
    console.log(report.report);
  } else {
    console.log("\nNo incident report yet for this chain.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
