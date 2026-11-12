export type Lang = "en-IN" | "hi-IN" | "kn-IN";

export type Expert = {
  id: string;
  name: string;
  role: string;
  years: number;
  retiresOn: string; // ISO date
  voice: string; // Sarvam bulbul:v3 speaker
};

export type Machine = { id: string; name: string; type: string; line: string };

export type FaultRecord = {
  recordId: string;
  date: string;
  machineId: string;
  faultCode: string;
  description: string;
  downtimeMin: number;
  technician: string;
  resolutionNote: string;
};

export type Confidence = "high" | "medium" | "low";

export type StoryExtraction = {
  title: string;
  summary: string;
  transcriptEnglish: string;
  faultCodes: string[];
  symptoms: { id: string; label: string }[];
  causes: { id: string; label: string; symptomIds: string[] }[];
  fixes: {
    id: string;
    label: string;
    causeIds: string[];
    steps: string[];
    tools: string[];
    safety: string[];
    estMinutes: number;
  }[];
  tribalTips: { text: string; quote: string }[];
  confidence: Confidence;
};

export type Story = {
  id: string;
  expertId: string;
  machineId: string;
  createdAt: string;
  language: Lang;
  transcript: string;
  audioUrl?: string; // seed audio served from /public/audio
  audioKey?: string; // IndexedDB key for recorded audio
  interviewQuestion?: string;
  extraction: StoryExtraction;
};

export type AskResult = {
  spokenAnswer: string;
  safetyWarnings: string[];
  steps: string[];
  tools: string[];
  citedStoryIds: string[];
  confidence: Confidence;
  notCovered: boolean;
  suggestedInterviewQuestion: string;
};

export type InterviewQuestion = { faultCode: string; machineId: string; question: string; why: string };

export type Guide = {
  faultCode: string;
  title: string;
  overview: string;
  safety: string[];
  steps: { text: string; sourceStoryIds: string[] }[];
  tools: string[];
  tips: { text: string; quote: string; storyId: string }[];
  estMinutes: number;
};

export type Source = "claude" | "offline" | "demo";

export type ApiEnvelope<T> = { data: T; source: Source; note?: string };

export type QueuedQuestion = {
  id: string;
  question: string;
  faultCode: string;
  machineId: string;
  why: string;
  origin: "gap" | "junior";
  createdAt: string;
};
