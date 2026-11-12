import { machinesFor } from "./records";
import { EXPERTS, FAULT_RECORDS, faultStats } from "./seed";
import type { FaultRecord } from "./types";
import type { Story } from "./types";

export type NodeType = "machine" | "fault" | "symptom" | "cause" | "fix" | "tool" | "expert";

export type GNode = {
  id: string;
  type: NodeType;
  label: string;
  storyIds: string[];
  machineId?: string;
  gap?: boolean;
};

export type GLink = { source: string; target: string; type: string };

export const NODE_COLORS: Record<NodeType, string> = {
  machine: "#cbd5e1",
  fault: "#ff7a1a",
  symptom: "#facc15",
  cause: "#c084fc",
  fix: "#22c55e",
  tool: "#38bdf8",
  expert: "#f472b6",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Derives the knowledge graph from stories plus fault records (gaps show as hollow fault nodes). */
export function buildGraph(stories: Story[], records: FaultRecord[] = FAULT_RECORDS): { nodes: GNode[]; links: GLink[] } {
  const nodes = new Map<string, GNode>();
  const links = new Map<string, GLink>();

  const addNode = (n: Omit<GNode, "storyIds">, storyId?: string) => {
    const existing = nodes.get(n.id);
    if (existing) {
      if (storyId && !existing.storyIds.includes(storyId)) existing.storyIds.push(storyId);
      if (n.gap === false) existing.gap = false;
      return existing;
    }
    const node: GNode = { ...n, storyIds: storyId ? [storyId] : [] };
    nodes.set(n.id, node);
    return node;
  };
  const addLink = (source: string, target: string, type: string) => {
    if (source === target) return;
    links.set(`${source}->${target}`, { source, target, type });
  };

  for (const m of machinesFor(records)) addNode({ id: `machine:${m.id}`, type: "machine", label: m.name, machineId: m.id });
  for (const f of faultStats(records)) {
    addNode({ id: `fault:${f.faultCode}`, type: "fault", label: `${f.faultCode} ${f.description}`, machineId: f.machineId, gap: true });
    addLink(`machine:${f.machineId}`, `fault:${f.faultCode}`, "has-fault");
  }

  for (const story of stories) {
    const x = story.extraction;
    const machineNode = `machine:${story.machineId}`;
    const expert = EXPERTS.find((e) => e.id === story.expertId);
    const expertNode = `expert:${story.expertId}`;
    addNode({ id: expertNode, type: "expert", label: expert?.name ?? story.expertId }, story.id);

    const faultNodes = x.faultCodes.map((code) => {
      const id = `fault:${code}`;
      addNode({ id, type: "fault", label: code, machineId: story.machineId, gap: x.fixes.length === 0 }, story.id);
      if (x.fixes.length) nodes.get(id)!.gap = false;
      addLink(machineNode, id, "has-fault");
      return id;
    });
    const roots = faultNodes.length ? faultNodes : [machineNode];

    const symptomIds = new Map<string, string>();
    for (const s of x.symptoms) {
      const id = `symptom:${norm(s.label)}`;
      symptomIds.set(s.id, id);
      addNode({ id, type: "symptom", label: s.label, machineId: story.machineId }, story.id);
      roots.forEach((r) => addLink(r, id, "shows"));
    }
    const causeIds = new Map<string, string>();
    for (const c of x.causes) {
      const id = `cause:${norm(c.label)}`;
      causeIds.set(c.id, id);
      addNode({ id, type: "cause", label: c.label, machineId: story.machineId }, story.id);
      const from = c.symptomIds.map((sid) => symptomIds.get(sid)).filter(Boolean) as string[];
      (from.length ? from : [...symptomIds.values()].length ? [...symptomIds.values()] : roots).forEach((f) =>
        addLink(f, id, "caused-by"),
      );
    }
    for (const fx of x.fixes) {
      const id = `fix:${norm(fx.label)}`;
      addNode({ id, type: "fix", label: fx.label, machineId: story.machineId }, story.id);
      const from = fx.causeIds.map((cid) => causeIds.get(cid)).filter(Boolean) as string[];
      (from.length ? from : [...causeIds.values()].length ? [...causeIds.values()] : roots).forEach((f) =>
        addLink(f, id, "fixed-by"),
      );
      addLink(expertNode, id, "knows");
      for (const t of fx.tools) {
        const tid = `tool:${norm(t)}`;
        addNode({ id: tid, type: "tool", label: t }, story.id);
        addLink(id, tid, "uses");
      }
    }
  }

  // Only keep links whose endpoints exist.
  const out = [...links.values()].filter((l) => nodes.has(l.source) && nodes.has(l.target));
  return { nodes: [...nodes.values()], links: out };
}

export function existingLabels(stories: Story[]): string[] {
  const set = new Set<string>();
  for (const s of stories) {
    s.extraction.symptoms.forEach((x) => set.add(x.label));
    s.extraction.causes.forEach((x) => set.add(x.label));
    s.extraction.fixes.forEach((x) => set.add(x.label));
  }
  return [...set];
}
