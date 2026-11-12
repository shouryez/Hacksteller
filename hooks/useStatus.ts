"use client";
import { useEffect, useState } from "react";

export type Status = { claude: boolean; sarvam: boolean; model: string };

let cached: Status | null = null;
let pending: Promise<Status> | null = null;

export function useStatus(): Status | null {
  const [status, setStatus] = useState<Status | null>(cached);
  useEffect(() => {
    if (cached) return;
    pending ??= fetch("/api/status")
      .then((r) => r.json() as Promise<Status>)
      .catch(() => ({ claude: false, sarvam: false, model: "" }));
    pending.then((s) => {
      cached = s;
      setStatus(s);
    });
  }, []);
  return status;
}
