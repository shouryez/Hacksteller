import { NextResponse } from "next/server";
import { CLAUDE_MODEL, hasClaude } from "@/lib/claude";
import { hasSarvam } from "@/lib/sarvam";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ claude: hasClaude(), sarvam: hasSarvam(), model: CLAUDE_MODEL });
}
