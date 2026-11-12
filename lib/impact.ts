import { computeCoverage } from "./coverage";
import { buildGuide } from "./guide";
import { mttr } from "./records";
import { FAULT_RECORDS } from "./seed";
import type { FaultRecord, Story } from "./types";

export type FaultImpact = { faultCode: string; savedMin: number; avgDowntimeMin: number; fixMin: number; occurrences: number };

/**
 * Downtime that captured fixes can avoid: for each covered fault, (average recorded downtime before
 * the guide existed − the expert's fix time) × occurrences. Faults without a captured fix count as
 * "at risk". Fixes confirmed in the field through a guide are reported separately.
 */
export function computeImpact(stories: Story[], records: FaultRecord[] = FAULT_RECORDS) {
  const cov = computeCoverage(stories, records);
  const perFault: FaultImpact[] = cov.faults
    .filter((f) => f.covered)
    .map((f) => {
      const fixMin = buildGuide(f.faultCode, stories)?.estMinutes || 30;
      const m = mttr(records, f.faultCode);
      const avg = m.beforeN ? m.beforeAvg : f.downtimeMin / f.occurrences;
      const occurrences = m.beforeN || f.occurrences;
      return { faultCode: f.faultCode, avgDowntimeMin: avg, fixMin, occurrences, savedMin: Math.max(0, avg - fixMin) * occurrences };
    })
    .sort((a, b) => b.savedMin - a.savedMin);
  const guided = records.filter((r) => r.viaGuide);
  const confirmedSavedMin = guided.reduce((a, r) => a + Math.max(0, mttr(records, r.faultCode).beforeAvg - r.downtimeMin), 0);
  return {
    perFault,
    savedMin: perFault.reduce((a, f) => a + f.savedMin, 0),
    atRiskMin: cov.atRiskMin,
    confirmedFixes: guided.length,
    confirmedSavedMin,
  };
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
