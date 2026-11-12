import { describe, expect, it } from "vitest";
import { completeness } from "@/lib/completeness";
import { buildDrill } from "@/lib/drill";
import { computeImpact } from "@/lib/impact";
import { mergeRecords, mttr, parseFaultCsv, sanitizeRecords } from "@/lib/records";
import { FAULT_RECORDS } from "@/lib/seed";
import type { FaultRecord } from "@/lib/types";
import { afterCapture, liveStory, seeds } from "./fixtures";

describe("parseFaultCsv", () => {
  it("parses a valid CSV with header aliases", () => {
    const csv = 'Date,Machine,Code,Description,Downtime,Tech,Notes\n2026-01-05,l-04,e-217,Spindle overload,45,Suresh,"reset, ok"\n2026-02-01,HP-02,H-102,Slow ram,120,Raju,bled air';
    const { records, errors } = parseFaultCsv(csv);
    expect(errors).toEqual([]);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ machineId: "L-04", faultCode: "E-217", downtimeMin: 45, resolutionNote: "reset, ok", origin: "import" });
  });

  it("reports missing columns and skips bad rows", () => {
    expect(parseFaultCsv("date,machine\n2026-01-01,L-04").errors[0]).toContain("faultCode");
    const { records, errors } = parseFaultCsv("date,machine,code,downtime\nnot-a-date,L-04,E-1,45\n2026-01-01,L-04,E-217,45");
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
});

describe("records", () => {
  const guided: FaultRecord = {
    recordId: "GW-1",
    date: "2026-11-12",
    machineId: "L-04",
    faultCode: "E-311",
    description: "Servo drive over-temperature",
    downtimeMin: 25,
    technician: "Suresh K",
    resolutionNote: "Fixed with GhostWrench guide",
    origin: "logged",
    viaGuide: true,
  };

  it("merges extra records and computes before/after repair time", () => {
    const all = mergeRecords([guided]);
    expect(all).toHaveLength(FAULT_RECORDS.length + 1);
    const m = mttr(all, "E-311");
    expect(m.guidedN).toBe(1);
    expect(m.guidedAvg).toBe(25);
    expect(m.beforeAvg).toBeGreaterThan(100);
  });

  it("feeds confirmed fixes into impact", () => {
    const impact = computeImpact(afterCapture, mergeRecords([guided]));
    expect(impact.confirmedFixes).toBe(1);
    expect(impact.confirmedSavedMin).toBeGreaterThan(100);
  });

  it("sanitizes untrusted record payloads", () => {
    expect(sanitizeRecords([{ faultCode: "E-1", machineId: "L-04", downtimeMin: "60", resolutionNote: "x".repeat(900) }])[0].resolutionNote).toHaveLength(300);
    expect(sanitizeRecords([{ faultCode: "E-1" }, null, "junk"])).toHaveLength(0);
    expect(sanitizeRecords("nope")).toEqual([]);
  });
});

describe("completeness", () => {
  it("marks the rehearsed story complete", () => {
    const c = completeness(liveStory.extraction);
    expect(c.done).toBe(c.total);
  });

  it("finds the holes in a thin story and offers follow-ups", () => {
    const c = completeness({ ...liveStory.extraction, fixes: [], tribalTips: [], manualCorrections: [], causes: [] });
    const missing = c.checks.filter((x) => !x.ok).map((x) => x.key);
    expect(missing).toEqual(expect.arrayContaining(["cause", "steps", "tools", "safety", "tribal"]));
    expect(c.checks.find((x) => x.key === "steps")?.followUp).toMatch(/step by step/i);
  });
});

describe("buildDrill", () => {
  it("builds valid questions from the stories", () => {
    const qs = buildDrill(afterCapture, FAULT_RECORDS, 7);
    expect(qs.length).toBeGreaterThanOrEqual(6);
    for (const q of qs) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options[q.answer]).toBeTruthy();
      expect(afterCapture.some((s) => s.id === q.storyId)).toBe(true);
    }
  });

  it("covers several faults and includes a manual trap", () => {
    const qs = buildDrill(afterCapture, FAULT_RECORDS, 3);
    expect(new Set(qs.map((q) => q.faultCode)).size).toBeGreaterThanOrEqual(3);
    expect(qs.some((q) => q.kind === "manual")).toBe(true);
  });

  it("is deterministic for a seed and empty without stories", () => {
    expect(buildDrill(seeds, FAULT_RECORDS, 42)).toEqual(buildDrill(seeds, FAULT_RECORDS, 42));
    expect(buildDrill([], FAULT_RECORDS, 1)).toEqual([]);
  });
});
