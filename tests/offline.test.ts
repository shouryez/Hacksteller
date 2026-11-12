import { describe, expect, it } from "vitest";
import { detectFaultCodes, detectMachine, guessFault, offlineAsk, offlineExtract, offlineInterview } from "@/lib/offline";
import { LIVE_DEMO } from "@/lib/seed";
import { afterCapture, seeds } from "./fixtures";

describe("offlineAsk", () => {
  it.each([
    ["The press ram is slow and there's a whining noise", "seed-s2"],
    ["Parts on the moulding machine are not filling fully", "seed-s3"],
    ["conveyor belt keeps drifting to one side", "seed-s4"],
    ["E-217 again on the lathe", "seed-s1"],
  ])("answers %s from the right story", (q, id) => {
    const r = offlineAsk(q, seeds);
    expect(r.notCovered).toBe(false);
    expect(r.citedStoryIds[0]).toBe(id);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("refuses the E-311 question before Raju explains it", () => {
    const r = offlineAsk("Machine four is getting hot and the alarm keeps coming back", seeds);
    expect(r.notCovered).toBe(true);
    expect(r.steps).toEqual([]);
    expect(r.suggestedInterviewQuestion).toContain("E-311");
  });

  it("answers the same question once the E-311 story is captured", () => {
    const r = offlineAsk("Machine four is getting hot and the alarm keeps coming back", afterCapture);
    expect(r.notCovered).toBe(false);
    expect(r.citedStoryIds).toContain("live-e311");
    expect(r.safetyWarnings.join(" ")).toMatch(/isolat/i);
  });

  it("refuses rather than misanswering a different uncaptured fault on the same machine", () => {
    const r = offlineAsk("The tool changer on the lathe is not indexing properly", afterCapture);
    expect(r.notCovered).toBe(true);
    expect(r.suggestedInterviewQuestion).toContain("E-105");
  });
});

describe("offlineExtract", () => {
  it("maps the rehearsed story to its curated extraction", () => {
    expect(offlineExtract(LIVE_DEMO.transcript, "L-04").faultCodes).toEqual(["E-311"]);
  });

  it("builds a usable extraction from an unseen transcript", () => {
    const x = offlineExtract(
      "When the tool changer does not index, first check the air pressure, it should be six bar. Because low air pressure means the carousel does not lock. Clean the proximity sensor with a cloth. Never put your hand in the carousel without lockout. Takes twenty minutes.",
      "L-04",
    );
    expect(x.faultCodes).toEqual(["E-105"]);
    expect(x.fixes[0].steps.length).toBeGreaterThanOrEqual(2);
    expect(x.fixes[0].estMinutes).toBe(20);
    expect(x.tribalTips.length).toBeGreaterThan(0);
  });
});

describe("helpers", () => {
  it("detects machines from shop-floor phrasing", () => {
    expect(detectMachine("machine four is hot")).toBe("L-04");
    expect(detectMachine("the hydraulic press is slow")).toBe("HP-02");
    expect(detectMachine("conveyor drifting")).toBe("CV-01");
  });

  it("normalises spoken fault codes", () => {
    expect(detectFaultCodes("e 311 and E-217, also q330")).toEqual(["E-311", "E-217", "Q-330"]);
  });

  it("guesses the fault a vague question is about", () => {
    expect(guessFault("lathe tool changer will not index")?.faultCode).toBe("E-105");
  });

  it("writes one interview question per gap, junior questions first", () => {
    const qs = offlineInterview(
      [{ faultCode: "E-311", machineId: "L-04", description: "Servo drive over-temperature", occurrences: 9, downtimeMin: 1758 }],
      [{ question: "Why does the press leak?", faultCode: "", machineId: "HP-02" }],
    ).questions;
    expect(qs).toHaveLength(2);
    expect(qs[0].question).toBe("Why does the press leak?");
    expect(qs[1].question).toContain("9 times");
  });
});
