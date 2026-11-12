import { machinesFor } from "./records";
import { FAULT_RECORDS, faultStats, type FaultStat } from "./seed";
import type { FaultRecord, Story } from "./types";

export type FaultCoverage = FaultStat & { covered: boolean; storyIds: string[]; expertIds: string[] };

export type Coverage = {
  overall: number; // 0..1, downtime-weighted
  faults: FaultCoverage[];
  gaps: FaultCoverage[];
  byMachine: { machineId: string; coverage: number; totalMin: number; coveredMin: number }[];
  atRiskMin: number;
  coveredCount: number;
  singleExpert: FaultCoverage[]; // covered, but only by an expert who is leaving
};

export function storiesForFault(stories: Story[], code: string): Story[] {
  return stories.filter((s) => s.extraction.faultCodes.includes(code) && s.extraction.fixes.length > 0);
}

export function computeCoverage(stories: Story[], records: FaultRecord[] = FAULT_RECORDS): Coverage {
  const faults: FaultCoverage[] = faultStats(records).map((f) => {
    const linked = storiesForFault(stories, f.faultCode);
    return {
      ...f,
      covered: linked.length > 0,
      storyIds: linked.map((s) => s.id),
      expertIds: [...new Set(linked.map((s) => s.expertId))],
    };
  });
  const total = faults.reduce((a, f) => a + f.downtimeMin, 0);
  const covered = faults.filter((f) => f.covered).reduce((a, f) => a + f.downtimeMin, 0);
  const byMachine = machinesFor(records).map((m) => {
    const mf = faults.filter((f) => f.machineId === m.id);
    const totalMin = mf.reduce((a, f) => a + f.downtimeMin, 0);
    const coveredMin = mf.filter((f) => f.covered).reduce((a, f) => a + f.downtimeMin, 0);
    return { machineId: m.id, coverage: totalMin ? coveredMin / totalMin : 1, totalMin, coveredMin };
  });
  const gaps = faults.filter((f) => !f.covered);
  return {
    overall: total ? covered / total : 1,
    faults,
    gaps,
    byMachine,
    atRiskMin: total - covered,
    coveredCount: faults.length - gaps.length,
    singleExpert: faults.filter((f) => f.covered && f.expertIds.length === 1 && f.expertIds[0] === "raju"),
  };
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
