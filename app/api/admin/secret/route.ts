import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";

// Lets an authenticated admin rotate the shared admin secret from the panel
// itself, instead of editing ADMIN_SECRET in Vercel env vars + redeploying.
// Requires the CURRENT secret (via the usual x-admin-secret header) to set
// a new one — same "change password" shape as any credential rotation.
export async function POST(req: Request) {
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const { newSecret } = await req.json();
  if (typeof newSecret !== "string" || newSecret.trim().length < 8) {
    return NextResponse.json(
      { error: "Admin secret baru minimal 8 karakter" },
      { status: 400 }
    );
  }

  const secretHash = await bcrypt.hash(newSecret.trim(), 10);
  const existing = await db.select().from(adminSettings).orderBy(asc(adminSettings.id)).limit(1);
  if (existing[0]) {
    await db
      .update(adminSettings)
      .set({ secretHash, updatedAt: new Date() })
      .where(eq(adminSettings.id, existing[0].id));
  } else {
    await db.insert(adminSettings).values({ secretHash });
  }

  return NextResponse.json({ ok: true });
}
