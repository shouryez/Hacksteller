"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Speaks text with Sarvam Bulbul (natural Indian voices) and falls back to the browser's speechSynthesis. */
export function useSpeaker(sarvam: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, lang: string, voice: string) => {
      stop();
      if (!text.trim()) return;
      setSpeaking(true);
      if (sarvam) {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text, lang, voice, pace: 0.95 }),
          });
          if (!res.ok) throw new Error("tts failed");
          const url = URL.createObjectURL(await res.blob());
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          const audio = audioRef.current ?? new Audio();
          audioRef.current = audio;
          audio.src = url;
          audio.onended = () => setSpeaking(false);
          await audio.play();
          return;
        } catch {
          /* fall back to the browser voice */
        }
      }
      const synth = window.speechSynthesis;
      if (!synth) return setSpeaking(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      const v = synth.getVoices().find((x) => x.lang === lang) ?? synth.getVoices().find((x) => x.lang.startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [sarvam, stop],
  );

  useEffect(() => stop, [stop]);

  return { speaking, speak, stop };
}
