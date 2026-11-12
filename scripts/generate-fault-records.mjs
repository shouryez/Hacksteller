// Deterministic generator for data/fault_records.{json,csv}. Run: node scripts/generate-fault-records.mjs
import { writeFileSync } from "node:fs";

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const faults = [
  { machineId: "L-04", faultCode: "E-217", description: "Spindle overload alarm", count: 14, avgMin: 45 },
  { machineId: "L-04", faultCode: "E-311", description: "Servo drive over-temperature", count: 9, avgMin: 200 },
  { machineId: "L-04", faultCode: "E-105", description: "Tool changer mis-index", count: 2, avgMin: 60 },
  { machineId: "HP-02", faultCode: "H-102", description: "Low system pressure / slow ram", count: 8, avgMin: 150 },
  { machineId: "HP-02", faultCode: "H-220", description: "Hydraulic oil temperature high", count: 3, avgMin: 90 },
  { machineId: "IM-07", faultCode: "Q-330", description: "Short shot / incomplete fill", count: 11, avgMin: 60 },
  { machineId: "IM-07", faultCode: "Q-410", description: "Flash on parting line", count: 4, avgMin: 45 },
  { machineId: "CV-01", faultCode: "C-045", description: "Belt misalignment trip", count: 12, avgMin: 40 },
  { machineId: "CV-01", faultCode: "C-090", description: "Drive motor overload", count: 2, avgMin: 120 },
];
const notes = ["reset, ok", "reset ok", "checked, fine", "adjusted", "done", "ok now", "called Raju, fixed", "replaced part", "cleaned", "restarted"];
const techs = ["Raju G", "Raju G", "Raju G", "Meena I", "Suresh K", "Night shift"];

const start = new Date("2025-11-01T00:00:00Z").getTime();
const span = 365 * 24 * 3600 * 1000;
const rows = [];
for (const f of faults) {
  for (let i = 0; i < f.count; i++) {
    let date = new Date(start + rand() * span);
    // E-311 bunches up in the hot months (Mar-Jun 2026)
    if (f.faultCode === "E-311" && i < 6) date = new Date(Date.UTC(2026, 2 + (i % 4), 1 + Math.floor(rand() * 27)));
    rows.push({
      date: date.toISOString().slice(0, 10),
      machineId: f.machineId,
      faultCode: f.faultCode,
      description: f.description,
      downtimeMin: Math.round(f.avgMin * (0.7 + rand() * 0.6)),
      technician: f.faultCode === "E-311" ? pick(["Suresh K", "Night shift", "Raju G"]) : pick(techs),
      resolutionNote: pick(notes),
    });
  }
}
rows.sort((a, b) => a.date.localeCompare(b.date));
rows.forEach((r, i) => (r.recordId = `FR-${String(i + 1).padStart(4, "0")}`));
const ordered = rows.map(({ recordId, ...r }) => ({ recordId, ...r }));

writeFileSync("data/fault_records.json", JSON.stringify(ordered, null, 2) + "\n");
const header = Object.keys(ordered[0]);
const csv = [header.join(","), ...ordered.map((r) => header.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
writeFileSync("data/fault_records.csv", csv + "\n");
writeFileSync("public/fault_records.csv", csv + "\n");

const by = {};
for (const r of ordered) {
  by[r.faultCode] ??= { n: 0, min: 0 };
  by[r.faultCode].n++;
  by[r.faultCode].min += r.downtimeMin;
}
console.log(ordered.length, "records");
console.table(by);
