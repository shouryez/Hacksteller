"use client";
import { useEffect, useState } from "react";

export type Status = { ai: "gemini" | "claude" | null; model: string; gemini: boolean; claude: boolean; sarvam: boolean };

let cached: Status | null = null;
let pending: Promise<Status> | null = null;

export function useStatus(): Status | null {
  const [status, setStatus] = useState<Status | null>(cached);
  useEffect(() => {
    if (cached) return;
    pending ??= fetch("/api/status")
      .then((r) => r.json() as Promise<Status>)
      .catch((): Status => ({ ai: null, model: "", gemini: false, claude: false, sarvam: false }));
    pending.then((s) => {
      cached = s;
      setStatus(s);
    });
  }, []);
  return status;
}
