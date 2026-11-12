"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ghost, Menu, Presentation, RotateCcw, Wrench, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useStatus } from "@/hooks/useStatus";
import { AlarmOverlay } from "./AlarmOverlay";
import { PresenterPanel } from "./PresenterPanel";
import { Toaster } from "./Toaster";
import { cn } from "./ui";

export const NAV = [
  { href: "/radar", label: "Radar" },
  { href: "/capture", label: "Capture" },
  { href: "/interview", label: "Interview" },
  { href: "/ask", label: "Ask" },
  { href: "/guides", label: "Guides" },
  { href: "/faults", label: "Fault Log" },
  { href: "/manual", label: "Manual✗" },
  { href: "/drill", label: "Drill" },
  { href: "/library", label: "Vault" },
  { href: "/graph", label: "Graph" },
];

const CHROMELESS = ["/", "/g", "/story"];

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12 rounded-2xl" : size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("flex shrink-0 items-center gap-2.5 font-display font-semibold tracking-tight", className)}>
      <span className={cn("relative grid place-items-center border border-accent/40 bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-[0_0_30px_-10px_rgba(255,122,26,0.9)]", box)}>
        <Ghost className={icon} />
        <Wrench className={cn("absolute -bottom-1 -right-1 text-text drop-shadow", size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5")} />
      </span>
      <span className={size === "lg" ? "text-2xl" : "text-lg"}>
        Ghost<span className="text-accent">Wrench</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useStatus();
  const hydrated = useStore((s) => s.hydrated);
  const demoMode = useStore((s) => s.demoMode);
  const setDemoMode = useStore((s) => s.setDemoMode);
  const reset = useStore((s) => s.reset);
  const presenterOpen = useStore((s) => s.presenterOpen);
  const setPresenterOpen = useStore((s) => s.setPresenterOpen);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // "P" toggles the presenter cue-card (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "p" || e.key === "P") setPresenterOpen(!useStore.getState().presenterOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPresenterOpen]);

  if (CHROMELESS.includes(pathname)) {
    return (
      <>
        {children}
        <PresenterPanel open={presenterOpen} onClose={() => setPresenterOpen(false)} />
        <Toaster />
      </>
    );
  }

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="relative min-h-screen">
      <div className="ambient" aria-hidden>
        <div className="ambient-grid" />
      </div>
      <div className="grain" aria-hidden />

      <header className="no-print sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="glass-strong mx-auto flex max-w-7xl items-center gap-3 rounded-2xl px-3 py-2 sm:px-4">
          <Link href="/" aria-label="GhostWrench home">
            <Logo />
          </Link>
          <nav className="relative hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn("relative rounded-lg px-2.5 py-1.5 text-[13px] transition-colors", active ? "text-text" : "text-muted hover:text-text")}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <StatusDot on={Boolean(status?.ai)} label={status?.ai === "gemini" ? "Gemini" : status?.ai === "claude" ? "Claude" : "Offline brain"} />
            <StatusDot on={Boolean(status?.sarvam)} label={status?.sarvam ? "Sarvam voice" : "Browser voice"} />
            <button
              onClick={() => {
                setDemoMode(!demoMode);
                toast(demoMode ? "Demo Mode off" : "Demo Mode on", {
                  tone: demoMode ? "info" : "warn",
                  description: demoMode ? "Live AI calls are back on." : "No live AI calls: rehearsed and offline answers only.",
                });
              }}
              className={cn(
                "hidden h-8 items-center gap-1.5 rounded-lg border px-2.5 font-medium transition-colors sm:inline-flex",
                demoMode ? "border-warn/50 bg-warn/10 text-warn" : "border-white/10 text-muted hover:text-text",
              )}
              title="Demo Mode skips live AI calls and uses rehearsed/offline answers"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", demoMode ? "bg-warn" : "bg-muted/50")} />
              Demo {demoMode ? "ON" : "off"}
            </button>
            <IconBtn onClick={() => setPresenterOpen(!presenterOpen)} active={presenterOpen} title="Presenter cue-card (P)" label="Toggle presenter cue-card">
              <Presentation className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                if (confirm("Reset to the seed demo data? Recorded stories will be removed.")) {
                  reset();
                  toast("Demo reset", { tone: "info", description: "Back to the 4 seed stories." });
                }
              }}
              title="Reset demo data"
              label="Reset demo data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={() => setMenuOpen((o) => !o)} label="Menu" className="lg:hidden">
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </IconBtn>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0, y: -6 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -6 }}
              className="glass-strong mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl lg:hidden"
            >
              <div className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-4">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn("rounded-xl px-3 py-2.5 text-sm", isActive(n.href) ? "bg-white/[0.08] text-text" : "text-muted hover:bg-white/5")}
                  >
                    {n.label}
                  </Link>
                ))}
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={cn("rounded-xl px-3 py-2.5 text-left text-sm sm:hidden", demoMode ? "bg-warn/10 text-warn" : "text-muted")}
                >
                  Demo Mode {demoMode ? "ON" : "off"}
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {hydrated ? children : <PageSkeleton />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="no-print mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-10 pt-4 text-xs text-muted">
        <Logo size="sm" className="text-muted" />
        <span>HackStellar PS-15</span>
        <span className="hidden sm:inline">·</span>
        <span>
          Press <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">P</kbd> for the presenter cue-card
        </span>
        <span className="ml-auto flex gap-4">
          <Link href="/" className="hover:text-text">
            Home
          </Link>
          <Link href="/story" className="hover:text-text">
            Play the intro
          </Link>
          <Link href="/report" className="hover:text-text">
            Handover report
          </Link>
        </span>
      </footer>
      <AlarmOverlay />
      <PresenterPanel open={presenterOpen} onClose={() => setPresenterOpen(false)} />
      <Toaster />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
  label,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
        active ? "border-accent/60 bg-accent/10 text-accent" : "border-white/10 text-muted hover:border-white/20 hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="h-9 w-80 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass h-64 animate-pulse rounded-2xl" />
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-muted xl:inline-flex">
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-ok shadow-[0_0_8px_rgba(34,197,94,0.9)]" : "bg-muted/50")} />
      {label}
    </span>
  );
}
