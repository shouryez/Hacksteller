"use client";
import { create } from "zustand";

export type ToastTone = "ok" | "info" | "warn" | "bad";
export type Toast = { id: string; title: string; description?: string; tone: ToastTone };

export const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: string) => void }>()((set) => ({
  toasts: [],
  push: (t) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(title: string, opts: { description?: string; tone?: ToastTone } = {}) {
  useToasts.getState().push({ title, description: opts.description, tone: opts.tone ?? "ok" });
}
