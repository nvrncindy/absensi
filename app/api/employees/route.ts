import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";
import { hashPin } from "@/lib/pin";

export async function GET(req: Request) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const rows = await db.select().from(employees).orderBy(asc(employees.createdAt));
  // Never send pinHash, the raw descriptor, or the reference photo to the
  // admin list view — it only needs to know whether a face is registered.
  const safe = rows.map(({ pinHash, descriptor, facePhoto, ...rest }) => ({
    ...rest,
    hasFace: !!descriptor,
  }));
  return NextResponse.json(safe);
}

export async function POST(req: Request) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { name, username, pin } = await req.json();
  const cleanUsername = String(username || "").trim().toLowerCase();

  if (!name || !cleanUsername || !/^\d{4,6}$/.test(pin || "")) {
    return NextResponse.json(
      { error: "Lengkapi nama, username, dan PIN (4-6 digit angka)" },
      { status: 400 }
    );
  }

  const existing = await db.select().from(employees);
  if (existing.length >= 7) {
    return NextResponse.json({ error: "Batas 7 pegawai tercapai" }, { status: 400 });
  }
  const dup = await db.select().from(employees).where(eq(employees.username, cleanUsername));
  if (dup.length) {
    return NextResponse.json({ error: "Username sudah dipakai pegawai lain" }, { status: 400 });
  }

  const pinHash = await hashPin(pin);
  const [row] = await db
    .insert(employees)
    .values({ name, username: cleanUsername, pinHash, descriptor: null })
    .returning();
  const { pinHash: _pinHash, ...safe } = row;
  return NextResponse.json(safe);
}
