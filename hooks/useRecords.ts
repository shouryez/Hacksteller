"use client";
import { useMemo } from "react";
import { mergeRecords } from "@/lib/records";
import { useStore } from "@/lib/store";

/** Bundled fault log plus imported records and fixes logged through guides. */
export function useRecords() {
  const extra = useStore((s) => s.extraRecords);
  return useMemo(() => mergeRecords(extra), [extra]);
}
