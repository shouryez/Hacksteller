"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToasts, type ToastTone } from "@/lib/toast";

const ICON: Record<ToastTone, typeof Info> = { ok: CheckCircle2, info: Info, warn: AlertTriangle, bad: XCircle };
const COLOR: Record<ToastTone, string> = { ok: "text-ok", info: "text-sky-300", warn: "text-warn", bad: "text-bad" };

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex gap-3 rounded-xl border border-line bg-panel2/95 p-3 shadow-2xl backdrop-blur"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${COLOR[t.tone]}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.title}</div>
                {t.description && <div className="mt-0.5 text-xs text-muted">{t.description}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-text" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
