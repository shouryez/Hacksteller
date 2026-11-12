import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "outline" | "ghost" | "danger" | "glass";
const variants: Record<Variant, string> = {
  primary:
    "shine bg-gradient-to-b from-ember to-accent text-black shadow-[0_0_30px_-8px_rgba(255,122,26,0.9),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110 border border-accent/60",
  outline: "glass text-text hover:border-accent/50 hover:text-white",
  ghost: "text-muted hover:text-text hover:bg-white/5",
  danger: "bg-gradient-to-b from-red-400 to-bad text-white border border-red-300/40 shadow-[0_0_30px_-10px_rgba(239,68,68,0.8)] hover:brightness-110",
  glass: "glass-strong text-text hover:border-white/20",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        size === "xl" && "h-14 px-8 text-lg rounded-2xl",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

type CardTone = "default" | "accent" | "bad" | "ok" | "warn";
const cardTones: Record<CardTone, string> = {
  default: "",
  accent: "glass-accent",
  bad: "glass-bad",
  ok: "glass-ok",
  warn: "glass-warn",
};

export function Card({
  className,
  tone = "default",
  hover = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone; hover?: boolean }) {
  return <div className={cn("glass rounded-2xl p-5", cardTones[tone], hover && "glass-hover", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "ok" | "bad" | "warn" | "info";
const tones: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/5 text-muted",
  accent: "border-accent/40 bg-accent/10 text-accent",
  ok: "border-ok/40 bg-ok/10 text-ok",
  bad: "border-bad/40 bg-bad/10 text-bad",
  warn: "border-warn/40 bg-warn/10 text-warn",
  info: "border-cool/40 bg-cool/10 text-sky-300",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted", className)}>{children}</div>;
}

/** Standard page heading: eyebrow, display title, description and right-aligned actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        <Eyebrow className="text-accent/90">{eyebrow}</Eyebrow>
        <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-pretty text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const field =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-text outline-none transition-colors placeholder:text-muted/70 focus:border-accent/70 focus:bg-white/[0.06]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
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
    <label className={cn("flex flex-col gap-1.5 text-xs text-muted", className)}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(field, "appearance-none bg-panel2/80 pr-8")}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel2 text-text">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pill filter chips (machines, experts…). */
export function Chip({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "h-9 rounded-full border px-3.5 text-xs font-medium transition-all",
        active ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_20px_-8px_rgba(255,122,26,0.8)]" : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-text",
        className,
      )}
      {...props}
    />
  );
}

/** Big number with label, used across dashboards. */
export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ok" | "bad" | "warn" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "font-display text-3xl font-semibold tabular-nums tracking-tight",
          tone === "ok" && "text-ok",
          tone === "bad" && "text-bad",
          tone === "warn" && "text-warn",
          tone === "accent" && "text-accent",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-sm text-text/85">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
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
