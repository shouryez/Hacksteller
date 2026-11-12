import { LIVE_DEMO, SEED_STORIES } from "@/lib/seed";
import type { Story } from "@/lib/types";

export const liveStory: Story = {
  id: "live-e311",
  expertId: LIVE_DEMO.expertId,
  machineId: LIVE_DEMO.machineId,
  createdAt: "2026-11-12T10:00:00.000Z",
  language: "en-IN",
  transcript: LIVE_DEMO.transcript,
  audioUrl: LIVE_DEMO.audioUrl,
  extraction: LIVE_DEMO.extraction,
};

export const seeds = SEED_STORIES;
export const afterCapture = [...SEED_STORIES, liveStory];
