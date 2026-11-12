"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { storyAudioUrl } from "@/lib/audio";
import type { Story } from "@/lib/types";
import { cn } from "./ui";

/** Play button for a story's original recording. */
export function AudioClip({ story, label = "Original recording", className }: { story: Story; label?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    storyAudioUrl(story).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, [story]);

  if (!url) return <span className="text-xs text-muted">No audio</span>;

  const toggle = () => {
    let a = audioRef.current;
    if (!a) {
      a = new Audio(url);
      a.ontimeupdate = () => setProgress(a!.duration ? a!.currentTime / a!.duration : 0);
      a.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
      audioRef.current = a;
    }
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play();
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-text hover:border-accent/60",
        className,
      )}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-black">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 translate-x-px" />}
      </span>
      <span>{label}</span>
      <span className="relative h-1 w-16 overflow-hidden rounded bg-white/10">
        <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${progress * 100}%` }} />
      </span>
    </button>
  );
}
