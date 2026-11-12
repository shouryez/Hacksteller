"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ghost, Menu, Presentation, RotateCcw, Wrench, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useStatus } from "@/hooks/useStatus";
import { PresenterPanel } from "./PresenterPanel";
import { Toaster } from "./Toaster";
import { cn } from "./ui";

export const NAV = [
  { href: "/", label: "Risk Radar" },
  { href: "/capture", label: "Capture" },
  { href: "/interview", label: "Interview" },
  { href: "/ask", label: "Ask the Ghost" },
  { href: "/guides", label: "Guides" },
  { href: "/library", label: "Vault" },
  { href: "/graph", label: "Graph" },
];

const CHROMELESS = ["/g", "/story"];

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
        <Toaster />
      </>
    );
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen">
      <div className="hazard no-print h-1 w-full opacity-80" />
      <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <Ghost className="h-5 w-5" />
              <Wrench className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-text" />
            </span>
            Ghost<span className="-ml-2 text-accent">Wrench</span>
          </Link>
          <nav className="hidden items-center gap-0.5 text-sm lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn("rounded-md px-2.5 py-1.5 text-muted transition-colors hover:text-text", isActive(n.href) && "bg-panel2 text-text")}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs">
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
                "hidden rounded-md border px-2 py-1 transition-colors sm:block",
                demoMode ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-muted hover:text-text",
              )}
              title="Demo Mode skips live AI calls and uses rehearsed/offline answers"
            >
              Demo {demoMode ? "ON" : "off"}
            </button>
            <button
              onClick={() => setPresenterOpen(!presenterOpen)}
              className={cn("rounded-md border p-1.5", presenterOpen ? "border-accent/60 text-accent" : "border-line text-muted hover:text-text")}
              title="Presenter cue-card (P)"
              aria-label="Toggle presenter cue-card"
            >
              <Presentation className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm("Reset to the seed demo data? Recorded stories will be removed.")) {
                  reset();
                  toast("Demo reset", { tone: "info", description: "Back to the 4 seed stories." });
                }
              }}
              className="rounded-md border border-line p-1.5 text-muted hover:text-text"
              title="Reset demo data"
              aria-label="Reset demo data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setMenuOpen((o) => !o)} className="rounded-md border border-line p-1.5 text-muted lg:hidden" aria-label="Menu">
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 p-3 sm:grid-cols-4">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn("rounded-lg px-3 py-2.5 text-sm text-muted", isActive(n.href) ? "bg-panel2 text-text" : "hover:bg-panel2")}
                  >
                    {n.label}
                  </Link>
                ))}
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={cn("rounded-lg px-3 py-2.5 text-left text-sm sm:hidden", demoMode ? "bg-warn/10 text-warn" : "text-muted")}
                >
                  Demo Mode {demoMode ? "ON" : "off"}
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{hydrated ? children : <PageSkeleton />}</main>
      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 pt-2 text-xs text-muted">
        GhostWrench · HackStellar PS-15 · Press <kbd className="rounded border border-line px-1">P</kbd> for the presenter cue-card ·{" "}
        <Link href="/story" className="hover:text-text">
          Play the intro
        </Link>
      </footer>
      <PresenterPanel open={presenterOpen} onClose={() => setPresenterOpen(false)} />
      <Toaster />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="h-8 w-72 animate-pulse rounded bg-panel2" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-line bg-panel" />
        <div className="h-64 animate-pulse rounded-xl border border-line bg-panel" />
      </div>
    </div>
  );
}

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-line px-2 py-1 text-muted xl:inline-flex">
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-ok" : "bg-muted")} />
      {label}
    </span>
  );
}
