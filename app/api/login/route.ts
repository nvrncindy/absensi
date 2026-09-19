import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifyPin } from "@/lib/pin";

export async function POST(req: Request) {
  const { username, pin } = await req.json();
  const cleanUsername = String(username || "").trim().toLowerCase();

  const rows = await db.select().from(employees).where(eq(employees.username, cleanUsername));
  const emp = rows[0];

  // Same generic error whether the username doesn't exist or the PIN is
  // wrong, so login can't be used to enumerate valid usernames.
  if (!emp || !(await verifyPin(pin || "", emp.pinHash))) {
    return NextResponse.json({ error: "Username atau PIN salah" }, { status: 401 });
  }
  if (!emp.descriptor) {
    return NextResponse.json(
      { error: "Wajah Anda belum didaftarkan admin" },
      { status: 400 }
    );
  }

  const { pinHash: _pinHash, ...safe } = emp;
  return NextResponse.json(safe);
}
