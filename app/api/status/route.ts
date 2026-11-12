import { NextResponse } from "next/server";
import { hasClaude } from "@/lib/claude";
import { hasGemini } from "@/lib/gemini";
import { activeModel, activeProvider } from "@/lib/llm";
import { hasSarvam } from "@/lib/sarvam";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ai: activeProvider(),
    model: activeModel(),
    gemini: hasGemini(),
    claude: hasClaude(),
    sarvam: hasSarvam(),
  });
}
