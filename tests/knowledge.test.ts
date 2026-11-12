import { describe, expect, it } from "vitest";
import { computeCoverage } from "@/lib/coverage";
import { buildGraph } from "@/lib/graph";
import { buildGuide, toShared } from "@/lib/guide";
import { computeImpact } from "@/lib/impact";
import { FAULT_RECORDS } from "@/lib/seed";
import { afterCapture, liveStory, seeds } from "./fixtures";

describe("coverage", () => {
  it("is downtime-weighted and jumps when E-311 is captured", () => {
    const before = computeCoverage(seeds);
    const after = computeCoverage(afterCapture);
    expect(before.overall).toBeGreaterThan(0.45);
    expect(before.overall).toBeLessThan(0.6);
    expect(after.overall).toBeGreaterThan(0.8);
    expect(before.gaps[0].faultCode).toBe("E-311");
    expect(after.gaps.map((g) => g.faultCode)).not.toContain("E-311");
  });

  it("accounts for every fault record", () => {
    const cov = computeCoverage(seeds);
    expect(cov.faults.reduce((a, f) => a + f.occurrences, 0)).toBe(FAULT_RECORDS.length);
  });
});

describe("graph", () => {
  it("shows uncaptured faults as gaps and fills them after capture", () => {
    const gapBefore = buildGraph(seeds).nodes.find((n) => n.id === "fault:E-311");
    const gapAfter = buildGraph(afterCapture).nodes.find((n) => n.id === "fault:E-311");
    expect(gapBefore?.gap).toBe(true);
    expect(gapAfter?.gap).toBe(false);
  });

  it("only links nodes that exist", () => {
    const g = buildGraph(afterCapture);
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(g.links.every((l) => ids.has(l.source) && ids.has(l.target))).toBe(true);
  });
});

describe("guides", () => {
  it("merges duplicate steps across stories and keeps sources", () => {
    const dup = { ...liveStory, id: "dup" };
    const g = buildGuide("E-311", [liveStory, dup])!;
    const single = buildGuide("E-311", [liveStory])!;
    expect(g.steps).toHaveLength(single.steps.length);
    expect(g.steps[0].sourceStoryIds).toEqual(["live-e311", "dup"]);
  });

  it("returns null for a fault nobody has explained", () => {
    expect(buildGuide("E-105", seeds)).toBeNull();
  });

  it("compacts a guide for the QR payload", () => {
    const shared = toShared(buildGuide("E-311", afterCapture)!, "CNC Lathe L-04");
    expect(shared.p.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(shared).length).toBeLessThan(1400);
  });
});

describe("impact", () => {
  it("counts avoidable downtime and shrinks the at-risk pool after capture", () => {
    const before = computeImpact(seeds);
    const after = computeImpact(afterCapture);
    expect(after.savedMin).toBeGreaterThan(before.savedMin);
    expect(after.atRiskMin).toBeLessThan(before.atRiskMin);
    expect(after.perFault[0].faultCode).toBe("E-311");
  });
});
