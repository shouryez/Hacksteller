"use client";
import { create } from "zustand";

export type Alarm = { faultCode: string; machineId: string; at: number };

/** A (simulated) live machine alarm. In production this would arrive from the PLC or CMMS. */
export const useAlarm = create<{ alarm: Alarm | null; raise: (faultCode: string, machineId: string) => void; clear: () => void }>()((set) => ({
  alarm: null,
  raise: (faultCode, machineId) => set({ alarm: { faultCode, machineId, at: Date.now() } }),
  clear: () => set({ alarm: null }),
}));

/** Three short two-tone beeps. Must be called from a user gesture. */
export function playAlarmTone() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    gain.connect(ctx.destination);
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.16);
    });
    setTimeout(() => void ctx.close().catch(() => {}), 1200);
  } catch {
    /* no audio available */
  }
}
