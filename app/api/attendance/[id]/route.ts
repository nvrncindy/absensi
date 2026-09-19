import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendance } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

// Correction tools for the admin "Riwayat Absensi" table — fixing a wrong
// clock time or removing a bad/duplicate record. Both require admin auth;
// there is no employee-facing access to these.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const { ts, type } = await req.json();

  const updates: { ts?: Date; type?: string } = {};
  if (ts !== undefined) {
    const parsed = new Date(ts);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Waktu tidak valid" }, { status: 400 });
    }
    updates.ts = parsed;
  }
  if (type !== undefined) {
    if (!["masuk", "pulang"].includes(type)) {
      return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });
    }
    updates.type = type;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan dikirim" }, { status: 400 });
  }

  await db.update(attendance).set(updates).where(eq(attendance.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  await db.delete(attendance).where(eq(attendance.id, Number(id)));
  return NextResponse.json({ ok: true });
}
