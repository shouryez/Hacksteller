import { FAULT_RECORDS, MACHINES } from "./seed";
import type { FaultRecord, Machine } from "./types";

export function mergeRecords(extra: FaultRecord[] = []): FaultRecord[] {
  return extra.length ? [...FAULT_RECORDS, ...extra] : FAULT_RECORDS;
}

/** Seed machines plus any machine that only appears in imported records. */
export function machinesFor(records: FaultRecord[]): Machine[] {
  const known = new Set(MACHINES.map((m) => m.id));
  const extra: Machine[] = [];
  for (const r of records) {
    if (!known.has(r.machineId)) {
      known.add(r.machineId);
      extra.push({ id: r.machineId, name: r.machineId, type: "Imported machine", line: "" });
    }
  }
  return extra.length ? [...MACHINES, ...extra] : MACHINES;
}

export function machineName(id: string): string {
  return MACHINES.find((m) => m.id === id)?.name ?? id;
}

/** Mean time to repair for one fault: ordinary records vs fixes confirmed through a guide. */
export function mttr(records: FaultRecord[], code: string) {
  const rs = records.filter((r) => r.faultCode === code);
  const avg = (xs: FaultRecord[]) => (xs.length ? xs.reduce((a, r) => a + r.downtimeMin, 0) / xs.length : 0);
  const before = rs.filter((r) => !r.viaGuide);
  const guided = rs.filter((r) => r.viaGuide);
  return { beforeAvg: avg(before), beforeN: before.length, guidedAvg: avg(guided), guidedN: guided.length };
}

const HEADER_ALIASES: Record<string, keyof FaultRecord> = {
  recordid: "recordId",
  id: "recordId",
  date: "date",
  machineid: "machineId",
  machine: "machineId",
  faultcode: "faultCode",
  code: "faultCode",
  alarm: "faultCode",
  description: "description",
  fault: "description",
  downtimemin: "downtimeMin",
  downtime: "downtimeMin",
  minutes: "downtimeMin",
  technician: "technician",
  tech: "technician",
  resolutionnote: "resolutionNote",
  resolution: "resolutionNote",
  note: "resolutionNote",
  notes: "resolutionNote",
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parses a fault-log CSV. Required columns: date, machine, fault code, downtime; the rest are optional. */
export function parseFaultCsv(text: string): { records: FaultRecord[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length < 2) return { records: [], errors: ["The file has no data rows."] };
  const cols = splitCsvLine(lines[0]).map((h) => HEADER_ALIASES[h.toLowerCase().replace(/[^a-z]/g, "")]);
  for (const need of ["date", "machineId", "faultCode", "downtimeMin"] as const) {
    if (!cols.includes(need)) errors.push(`Missing column: ${need}`);
  }
  if (errors.length) return { records: [], errors };
  const records: FaultRecord[] = [];
  const stamp = Date.now().toString(36);
  lines.slice(1).forEach((line, i) => {
    const cells = splitCsvLine(line);
    const row: Partial<Record<keyof FaultRecord, string>> = {};
    cols.forEach((c, k) => {
      if (c) row[c] = cells[k] ?? "";
    });
    const downtime = Number(row.downtimeMin);
    const date = (row.date ?? "").slice(0, 10);
    if (!row.machineId || !row.faultCode || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(downtime) || downtime < 0) {
      errors.push(`Row ${i + 2} skipped: needs date (YYYY-MM-DD), machine, fault code and downtime in minutes.`);
      return;
    }
    records.push({
      recordId: row.recordId || `IMP-${stamp}-${i + 1}`,
      date,
      machineId: row.machineId.toUpperCase(),
      faultCode: row.faultCode.toUpperCase(),
      description: row.description || row.faultCode.toUpperCase(),
      downtimeMin: Math.round(downtime),
      technician: row.technician || "unknown",
      resolutionNote: row.resolutionNote || "",
      origin: "import",
    });
  });
  return { records, errors: errors.slice(0, 5) };
}

/** Validates records sent from the browser before they reach a prompt. */
export function sanitizeRecords(input: unknown): FaultRecord[] {
  if (!Array.isArray(input)) return [];
  const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  return input.slice(0, 2000).flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const x = r as Record<string, unknown>;
    const downtimeMin = Number(x.downtimeMin);
    if (!x.faultCode || !x.machineId || !Number.isFinite(downtimeMin)) return [];
    return [
      {
        recordId: str(x.recordId, 40),
        date: str(x.date, 10),
        machineId: str(x.machineId, 20),
        faultCode: str(x.faultCode, 20),
        description: str(x.description, 120),
        downtimeMin,
        technician: str(x.technician, 60),
        resolutionNote: str(x.resolutionNote, 300),
        viaGuide: Boolean(x.viaGuide),
      },
    ];
  });
}
