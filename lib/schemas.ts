import { z } from "zod";

const confidence = z.enum(["high", "medium", "low"]);

export const StoryExtractionSchema = z.object({
  title: z.string().describe("Short, specific title, e.g. 'Spindle overload after humid weekends'"),
  summary: z.string().describe("One or two sentences summarising the knowledge"),
  transcriptEnglish: z.string().describe("Clean English rendering of the transcript, faithful to what was said"),
  faultCodes: z.array(z.string()),
  symptoms: z.array(z.object({ id: z.string(), label: z.string() })),
  causes: z.array(z.object({ id: z.string(), label: z.string(), symptomIds: z.array(z.string()) })),
  fixes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      causeIds: z.array(z.string()),
      steps: z.array(z.string()),
      tools: z.array(z.string()),
      safety: z.array(z.string()),
      estMinutes: z.number(),
    }),
  ),
  tribalTips: z.array(z.object({ text: z.string(), quote: z.string() })),
  confidence,
});

export const AskResultSchema = z.object({
  spokenAnswer: z.string(),
  safetyWarnings: z.array(z.string()),
  steps: z.array(z.string()),
  tools: z.array(z.string()),
  citedStoryIds: z.array(z.string()),
  confidence,
  notCovered: z.boolean(),
  suggestedInterviewQuestion: z.string().describe("Empty string when the question is covered"),
});

export const InterviewSchema = z.object({
  questions: z.array(
    z.object({ faultCode: z.string(), machineId: z.string(), question: z.string(), why: z.string() }),
  ),
});

export const GuideSchema = z.object({
  faultCode: z.string(),
  title: z.string(),
  overview: z.string(),
  safety: z.array(z.string()),
  steps: z.array(z.object({ text: z.string(), sourceStoryIds: z.array(z.string()) })),
  tools: z.array(z.string()),
  tips: z.array(z.object({ text: z.string(), quote: z.string(), storyId: z.string() })),
  estMinutes: z.number(),
});
