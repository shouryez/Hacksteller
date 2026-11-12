"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SEED_STORIES } from "./seed";
import type { Guide, Lang, QueuedQuestion, Source, Story } from "./types";

type GuideCacheEntry = { key: string; guide: Guide; source: Source };
export type GapQuestion = { question: string; why: string; source: Source };

type State = {
  stories: Story[];
  queue: QueuedQuestion[];
  gapQuestions: Record<string, GapQuestion>;
  guideCache: Record<string, GuideCacheEntry>;
  demoMode: boolean;
  answerLang: Lang;
  captureLang: Lang;
  hydrated: boolean;
  addStory: (s: Story) => void;
  removeStory: (id: string) => void;
  enqueue: (q: Omit<QueuedQuestion, "id" | "createdAt">) => void;
  dequeue: (id: string) => void;
  setGapQuestions: (q: Record<string, GapQuestion>) => void;
  cacheGuide: (code: string, entry: GuideCacheEntry) => void;
  setDemoMode: (v: boolean) => void;
  setAnswerLang: (l: Lang) => void;
  setCaptureLang: (l: Lang) => void;
  reset: () => void;
};

const initial = () => ({
  stories: SEED_STORIES,
  queue: [] as QueuedQuestion[],
  gapQuestions: {} as Record<string, GapQuestion>,
  guideCache: {} as Record<string, GuideCacheEntry>,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial(),
      demoMode: false,
      answerLang: "en-IN",
      captureLang: "en-IN",
      hydrated: false,
      addStory: (s) => set((st) => ({ stories: [...st.stories.filter((x) => x.id !== s.id), s] })),
      removeStory: (id) => set((st) => ({ stories: st.stories.filter((x) => x.id !== id) })),
      enqueue: (q) =>
        set((st) =>
          st.queue.some((x) => x.question === q.question)
            ? st
            : { queue: [{ ...q, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...st.queue] },
        ),
      dequeue: (id) => set((st) => ({ queue: st.queue.filter((x) => x.id !== id) })),
      setGapQuestions: (q) => set((st) => ({ gapQuestions: { ...st.gapQuestions, ...q } })),
      cacheGuide: (code, entry) => set((st) => ({ guideCache: { ...st.guideCache, [code]: entry } })),
      setDemoMode: (demoMode) => set({ demoMode }),
      setAnswerLang: (answerLang) => set({ answerLang }),
      setCaptureLang: (captureLang) => set({ captureLang }),
      reset: () => set({ ...initial() }),
    }),
    {
      name: "ghostwrench-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (st) => {
        const { hydrated, ...rest } = st;
        void hydrated;
        return rest;
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);
