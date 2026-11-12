"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Ghost, RotateCcw, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { useStatus } from "@/hooks/useStatus";
import { cn } from "./ui";

const NAV = [
  { href: "/", label: "Risk Radar" },
  { href: "/capture", label: "Capture" },
  { href: "/interview", label: "Interview" },
  { href: "/ask", label: "Ask the Ghost" },
  { href: "/guides", label: "Guides" },
  { href: "/graph", label: "Graph" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const status = useStatus();
  const demoMode = useStore((s) => s.demoMode);
  const setDemoMode = useStore((s) => s.setDemoMode);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  if (pathname === "/g") return <>{children}</>;

  return (
    <div className="min-h-screen">
      <div className="hazard no-print h-1 w-full opacity-80" />
      <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <Ghost className="h-5 w-5" />
              <Wrench className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-text" />
            </span>
            Ghost<span className="text-accent">Wrench</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-muted transition-colors hover:text-text",
                  (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)) && "bg-panel2 text-text",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <StatusDot on={Boolean(status?.claude)} label={status?.claude ? "Claude" : "Offline brain"} />
            <StatusDot on={Boolean(status?.sarvam)} label={status?.sarvam ? "Sarvam voice" : "Browser voice"} />
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={cn(
                "rounded-md border px-2 py-1 transition-colors",
                demoMode ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-muted hover:text-text",
              )}
              title="Demo Mode skips live AI calls and uses rehearsed/offline answers"
            >
              Demo Mode {demoMode ? "ON" : "off"}
            </button>
            <button
              onClick={() => {
                if (confirm("Reset to the seed demo data? Recorded stories will be removed.")) reset();
              }}
              className="rounded-md border border-line p-1.5 text-muted hover:text-text"
              title="Reset demo data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-line px-2 py-1 text-muted sm:inline-flex">
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-ok" : "bg-muted")} />
      {label}
    </span>
  );
}
