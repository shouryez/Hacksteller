"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

export type QrBase = {
  /** Origin the QR should point at. */
  base: string | null;
  /** True when the base is this laptop's Wi-Fi address (the phone must be on the same network). */
  lan: boolean;
  /** Other LAN addresses the presenter can switch to if the first one doesn't work. */
  options: string[];
  chosen: string | null;
  choose: (ip: string) => void;
};

/**
 * On localhost a QR pointing at "localhost" would open the phone itself, so swap in the laptop's
 * LAN address (or PUBLIC_URL when set). Deployed sites keep their own origin.
 */
export function useQrBase(): QrBase {
  const qrHost = useStore((s) => s.qrHost);
  const setQrHost = useStore((s) => s.setQrHost);
  const [info, setInfo] = useState<{ publicUrl: string | null; ips: string[] } | null>(null);
  const [isLocal, setIsLocal] = useState<boolean | null>(null);

  useEffect(() => {
    const local = LOCAL.test(window.location.hostname);
    setIsLocal(local);
    if (!local) return;
    fetch("/api/lan")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ publicUrl: null, ips: [] }));
  }, []);

  if (isLocal === null) return { base: null, lan: false, options: [], chosen: null, choose: setQrHost };
  if (!isLocal) return { base: window.location.origin, lan: false, options: [], chosen: null, choose: setQrHost };
  if (!info) return { base: null, lan: false, options: [], chosen: null, choose: setQrHost };
  if (info.publicUrl) return { base: info.publicUrl, lan: false, options: [], chosen: null, choose: setQrHost };
  const chosen = qrHost && info.ips.includes(qrHost) ? qrHost : info.ips[0] ?? null;
  const port = window.location.port ? `:${window.location.port}` : "";
  return {
    base: chosen ? `${window.location.protocol}//${chosen}${port}` : window.location.origin,
    lan: Boolean(chosen),
    options: info.ips,
    chosen,
    choose: setQrHost,
  };
}
