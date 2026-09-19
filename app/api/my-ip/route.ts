import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/client-ip";

// Public on purpose: this only ever tells a caller their own IP, which
// they could already find via any "what's my IP" service. Used by the
// admin panel's "Pakai IP saya sekarang" button to auto-fill the office
// WiFi IP field while standing on the office network.
export async function GET(req: Request) {
  return NextResponse.json({ ip: getClientIp(req) });
}
