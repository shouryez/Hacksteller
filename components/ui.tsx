import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "outline" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-black hover:bg-orange-400 shadow-[0_0_24px_-6px_rgba(255,122,26,0.7)]",
  outline: "border border-line bg-panel2 text-text hover:border-accent/60 hover:text-white",
  ghost: "text-muted hover:text-text hover:bg-panel2",
  danger: "bg-bad text-white hover:bg-red-400",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-panel/90 p-5 backdrop-blur", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "ok" | "bad" | "warn" | "info";
const tones: Record<Tone, string> = {
  neutral: "border-line bg-panel2 text-muted",
  accent: "border-accent/40 bg-accent/10 text-accent",
  ok: "border-ok/40 bg-ok/10 text-ok",
  bad: "border-bad/40 bg-bad/10 text-bad",
  warn: "border-warn/40 bg-warn/10 text-warn",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-300",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] text-muted", className)}>{children}</div>;
}

export function Select({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  label?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs text-muted", className)}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-line bg-panel2 px-3 text-sm text-text outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SourceBadge({ source, note }: { source?: string; note?: string }) {
  if (!source) return null;
  if (source === "gemini") return <Badge tone="info">Gemini</Badge>;
  if (source === "claude") return <Badge tone="info">Claude</Badge>;
  if (source === "demo") return <Badge tone="warn">Demo Mode</Badge>;
  return (
    <span title={note ? `Answered offline because: ${note}` : "Answered by the offline brain"}>
      <Badge tone="neutral">Offline brain{note ? " ⓘ" : ""}</Badge>
    </span>
  );
}
