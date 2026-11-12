"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Live captions via the browser's Web Speech API (Chrome/Edge). Restarts itself after pauses. */
export function useSpeechRecognition(lang: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    setFinalText("");
    setInterim("");
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let fin = "";
      let mid = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript + " ";
        else mid += r[0].transcript;
      }
      if (fin) setFinalText((t) => (t + " " + fin).replace(/\s+/g, " ").trimStart());
      setInterim(mid);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") wantRef.current = false;
    };
    rec.onend = () => {
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, finalText, interim, start, stop };
}
