import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const { descriptor, photo } = await req.json();
  if (!Array.isArray(descriptor)) {
    return NextResponse.json({ error: "descriptor tidak valid" }, { status: 400 });
  }
  if (photo !== undefined && photo !== null) {
    if (typeof photo !== "string" || !photo.startsWith("data:image/") || photo.length > 300_000) {
      return NextResponse.json({ error: "photo tidak valid" }, { status: 400 });
    }
  }
  await db
    .update(employees)
    .set({ descriptor, facePhoto: photo ?? null })
    .where(eq(employees.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  await db.delete(employees).where(eq(employees.id, Number(id)));
  return NextResponse.json({ ok: true });
}
