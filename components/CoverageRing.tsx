"use client";
import { motion } from "framer-motion";

export function CoverageRing({ value, size = 180, label }: { value: number; size?: number; label?: string }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 0.75 ? "#22c55e" : value >= 0.5 ? "#facc15" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#252c36" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.div key={Math.round(value * 100)} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-bold tabular-nums">
            {Math.round(value * 100)}%
          </motion.div>
          {label && <div className="mt-1 max-w-[120px] text-[11px] leading-tight text-muted">{label}</div>}
        </div>
      </div>
    </div>
  );
}
