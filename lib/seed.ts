import expertsJson from "@/data/experts.json";
import machinesJson from "@/data/machines.json";
import recordsJson from "@/data/fault_records.json";
import storiesJson from "@/data/stories.json";
import liveJson from "@/data/demo/live-story.json";
import manualJson from "@/data/manual.json";
import type { Expert, FaultRecord, Machine, ManualEntry, Story, StoryExtraction } from "./types";

export const EXPERTS = expertsJson as Expert[];
export const MACHINES = machinesJson as Machine[];
export const FAULT_RECORDS = recordsJson as FaultRecord[];
export const SEED_STORIES = storiesJson as Story[];
export const LIVE_DEMO = liveJson as {
  faultCode: string;
  machineId: string;
  expertId: string;
  audioUrl: string;
  transcript: string;
  extraction: StoryExtraction;
};

export const MANUAL = manualJson as ManualEntry[];

export function manualFor(code: string): ManualEntry | undefined {
  return MANUAL.find((m) => m.faultCode === code);
}

export const PRIMARY_EXPERT = EXPERTS[0];

export function expertById(id: string): Expert | undefined {
  return EXPERTS.find((e) => e.id === id);
}

export function machineById(id: string): Machine | undefined {
  return MACHINES.find((m) => m.id === id);
}

export type FaultStat = {
  faultCode: string;
  machineId: string;
  description: string;
  occurrences: number;
  downtimeMin: number;
  lastDate: string;
  notes: string[];
};

export function faultStats(records: FaultRecord[] = FAULT_RECORDS): FaultStat[] {
  const map = new Map<string, FaultStat>();
  for (const r of records) {
    const s = map.get(r.faultCode) ?? {
      faultCode: r.faultCode,
      machineId: r.machineId,
      description: r.description,
      occurrences: 0,
      downtimeMin: 0,
      lastDate: r.date,
      notes: [],
    };
    s.occurrences += 1;
    s.downtimeMin += r.downtimeMin;
    if (r.date > s.lastDate) s.lastDate = r.date;
    s.notes.push(r.resolutionNote);
    map.set(r.faultCode, s);
  }
  return [...map.values()].sort((a, b) => b.downtimeMin - a.downtimeMin);
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const ms = new Date(isoDate + "T00:00:00").getTime() - new Date(now.toDateString()).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function hours(min: number): string {
  const h = min / 60;
  return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1)} h`;
}
