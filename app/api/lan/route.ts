import { NextResponse } from "next/server";
import { lanAddresses } from "@/lib/lan";

export const dynamic = "force-dynamic";

/** Where a phone can reach this server: a configured public URL, or this machine's LAN addresses. */
export function GET() {
  const publicUrl = process.env.PUBLIC_URL?.trim().replace(/\/+$/, "") || null;
  return NextResponse.json({ publicUrl, ips: lanAddresses() });
}
