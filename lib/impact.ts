import { computeCoverage } from "./coverage";
import { buildGuide } from "./guide";
import type { Story } from "./types";

export type FaultImpact = { faultCode: string; savedMin: number; avgDowntimeMin: number; fixMin: number; occurrences: number };

/**
 * Downtime that captured fixes can avoid: for each covered fault, (average recorded downtime − the
 * expert's fix time) × occurrences per year. Faults without a captured fix count as "at risk".
 */
export function computeImpact(stories: Story[]) {
  const cov = computeCoverage(stories);
  const perFault: FaultImpact[] = cov.faults
    .filter((f) => f.covered)
    .map((f) => {
      const fixMin = buildGuide(f.faultCode, stories)?.estMinutes || 30;
      const avg = f.downtimeMin / f.occurrences;
      return { faultCode: f.faultCode, avgDowntimeMin: avg, fixMin, occurrences: f.occurrences, savedMin: Math.max(0, avg - fixMin) * f.occurrences };
    })
    .sort((a, b) => b.savedMin - a.savedMin);
  return {
    perFault,
    savedMin: perFault.reduce((a, f) => a + f.savedMin, 0),
    atRiskMin: cov.atRiskMin,
  };
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
