"use client";
import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { DelegationEvent, RuleEvaluationEvent, WsEvent } from "@/lib/types";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label?: string;
  role?: string;
  state: "idle" | "active" | "blocked" | "dormant";
}
interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  status: "pending" | "ok" | "flag" | "deny";
  action: string;
}

interface Props {
  events: WsEvent[];
  dormantAgents?: Set<string>;
  /** Compact mode: shrinks margins/text for side-by-side panels in Scene 6 */
  compact?: boolean;
}

export function ChainGraph({ events, dormantAgents, compact = false }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const linkMap = new Map<string, Link>();
    let blockedChain: string | null = null;

    for (const e of events) {
      if (e.type === "delegation") {
        const d = e as DelegationEvent;
        if (!nodeMap.has(d.caller_id)) nodeMap.set(d.caller_id, { id: d.caller_id, state: "active" });
        if (!nodeMap.has(d.callee_id)) nodeMap.set(d.callee_id, { id: d.callee_id, state: "active" });
        const key = `${d.caller_id}->${d.callee_id}`;
        linkMap.set(key, { source: d.caller_id, target: d.callee_id, status: "ok", action: d.action });
      } else if (e.type === "rule_evaluation") {
        const r = e as RuleEvaluationEvent;
        if (r.result === "DENY") {
          blockedChain = r.chain_id;
          if (r.matched_segment && r.matched_segment.includes("->")) {
            const [a, b] = r.matched_segment.split("->");
            const k = `${a}->${b}`;
            if (linkMap.has(k)) linkMap.get(k)!.status = "deny";
            else linkMap.set(k, { source: a, target: b, status: "deny", action: r.rule_name });
            if (!nodeMap.has(a)) nodeMap.set(a, { id: a, state: "blocked" });
            if (!nodeMap.has(b)) nodeMap.set(b, { id: b, state: "blocked" });
          }
        } else if (r.result === "FLAG") {
          if (r.matched_segment && r.matched_segment.includes("->")) {
            const [a, b] = r.matched_segment.split("->");
            const k = `${a}->${b}`;
            if (linkMap.has(k) && linkMap.get(k)!.status !== "deny") linkMap.get(k)!.status = "flag";
          }
        }
      }
    }
    // mark dormant
    if (dormantAgents) {
      for (const id of nodeMap.keys()) {
        if (dormantAgents.has(id)) nodeMap.get(id)!.state = "dormant";
      }
    }
    if (blockedChain) {
      for (const n of nodeMap.values()) if (n.state !== "dormant") n.state = "blocked";
    }
    return { nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) };
  }, [events, dormantAgents]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const w = svgRef.current.clientWidth || 600;
    const h = svgRef.current.clientHeight || 400;
    const margin = compact ? 24 : 48;

    const sim = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id).distance(compact ? 90 : 120))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide(compact ? 26 : 34));

    const defs = svg.append("defs");
    ["ok", "flag", "deny"].forEach((status) => {
      defs.append("marker")
        .attr("id", `arrow-${status}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22).attr("refY", 0)
        .attr("markerWidth", 8).attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", status === "ok" ? "#10b981" : status === "flag" ? "#f59e0b" : "#ef4444");
    });

    const link = svg.append("g").selectAll("line")
      .data(links).enter().append("line")
      .attr("stroke-width", 2)
      .attr("stroke", (d) => d.status === "deny" ? "#ef4444" : d.status === "flag" ? "#f59e0b" : "#10b981")
      .attr("stroke-dasharray", (d) => d.status === "deny" ? "4 4" : "0")
      .attr("marker-end", (d) => `url(#arrow-${d.status})`)
      .style("opacity", (d) => d.status === "deny" ? 0.85 : 0.9);

    const node = svg.append("g").selectAll("g")
      .data(nodes).enter().append("g")
      .style("cursor", "default")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append("circle")
      .attr("r", compact ? 16 : 22)
      .attr("fill", (d) => d.state === "dormant" ? "#1c232c" : d.state === "blocked" ? "#1c1116" : "#1a1325")
      .attr("stroke", (d) => d.state === "dormant" ? "#52525b" : d.state === "blocked" ? "#ef4444" : "#7c3aed")
      .attr("stroke-width", 2)
      .style("filter", (d) => d.state === "active" ? "drop-shadow(0 0 6px rgba(167,139,250,0.5))" : "");

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", compact ? 28 : 38)
      .attr("font-size", compact ? 9 : 11)
      .attr("fill", "#e5e7eb")
      .text((d) => {
        const id = d.id;
        // Trim long agent ids for the graph label.
        const m = id.match(/agent-([a-z-]+)-/);
        return m ? m[1] : id.replace("user-session-001", "user");
      });

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x ?? 0)
        .attr("y1", (d) => (d.source as Node).y ?? 0)
        .attr("x2", (d) => (d.target as Node).x ?? 0)
        .attr("y2", (d) => (d.target as Node).y ?? 0);
      node.attr("transform", (d) => `translate(${Math.max(margin, Math.min(w - margin, d.x ?? 0))},${Math.max(margin, Math.min(h - margin, d.y ?? 0))})`);
    });

    return () => { sim.stop(); };
  }, [nodes, links, compact]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-edge text-sm">
          <span className="text-zinc-500">Press a scenario button to populate the chain graph</span>
        </div>
      )}
    </div>
  );
}
