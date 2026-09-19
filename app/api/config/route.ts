import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officeConfig } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { checkAdminAuth, isValidAdminSecret } from "@/lib/admin-auth";
import { getClientIp, isIpAllowed } from "@/lib/client-ip";

// office_config is meant to hold exactly one row. GET and POST both pick
// the lowest id as "the" row (instead of an unordered `limit(1)`, which
// Postgres doesn't guarantee picks the same row twice) so they can never
// disagree about which row is canonical if a duplicate ever sneaks in.
export async function GET(req: Request) {
  // Public on purpose: the employee-facing page needs office lat/lng/radius
  // to run the geofence check client-side before showing the camera. If an
  // admin secret is attached, also include the raw allowedIp (so the admin
  // form can be prefilled) — otherwise only a computed wifiOk boolean is
  // exposed, never the configured IP itself, to unauthenticated callers.
  const rows = await db.select().from(officeConfig).orderBy(asc(officeConfig.id)).limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json(null);

  const isAdmin = await isValidAdminSecret(req);
  const wifiOk = isIpAllowed(getClientIp(req), row.allowedIp);
  const { allowedIp, ...publicRow } = row;

  return NextResponse.json(isAdmin ? { ...row, wifiOk } : { ...publicRow, wifiOk });
}

export async function POST(req: Request) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { name, lat, lng, radius, allowedIp } = body;
  if (
    !name ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof radius !== "number" ||
    radius <= 0
  ) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }
  const cleanAllowedIp = typeof allowedIp === "string" && allowedIp.trim() ? allowedIp.trim() : null;

  const existing = await db.select().from(officeConfig).orderBy(asc(officeConfig.id)).limit(1);
  if (existing[0]) {
    await db
      .update(officeConfig)
      .set({ name, lat, lng, radius, allowedIp: cleanAllowedIp })
      .where(eq(officeConfig.id, existing[0].id));
  } else {
    await db.insert(officeConfig).values({ name, lat, lng, radius, allowedIp: cleanAllowedIp });
  }
  return NextResponse.json({ ok: true });
}
