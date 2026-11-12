"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Microphone recording with a live level meter. */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start(250);
      mediaRef.current = rec;
      setSeconds(0);
      const t0 = Date.now();
      timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 250);
      setRecording(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone unavailable");
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const rec = mediaRef.current;
        if (!rec || rec.state === "inactive") {
          cleanup();
          setRecording(false);
          return resolve(null);
        }
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          cleanup();
          setRecording(false);
          resolve(blob.size ? blob : null);
        };
        rec.stop();
      }),
    [cleanup],
  );

  useEffect(() => cleanup, [cleanup]);

  return { recording, level, seconds, error, start, stop };
}
