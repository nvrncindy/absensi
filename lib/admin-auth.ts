import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { asc } from "drizzle-orm";

/**
 * Shared-secret gate for the admin-only attendance endpoints (office
 * location, employee CRUD, face registration).
 *
 * This is intentionally NOT a full auth system. It exists only to close the
 * "anyone who finds the URL can edit everything" hole in this kit. Once
 * these files are pasted into a real Next.js project that already has
 * better-auth (or similar) with an admin/HR role, replace calls to
 * `checkAdminAuth` with that project's real session + role check instead.
 *
 * The secret starts out as the ADMIN_SECRET env var (set it to a long
 * random string, e.g. `openssl rand -hex 32`), but can be changed from the
 * admin panel (POST /api/admin/secret) without touching env vars/redeploy —
 * once that's done, the bcrypt hash stored in `admin_settings` takes over
 * and the env var is no longer consulted.
 *
 * Usage: send the current secret back on admin requests as the
 * `x-admin-secret` header.
 */

async function getStoredSecretHash(): Promise<string | null> {
  const [row] = await db.select().from(adminSettings).orderBy(asc(adminSettings.id)).limit(1);
  return row?.secretHash ?? null;
}

// Boolean check for spots that need to know "is this an admin?" without
// rejecting the request outright (e.g. GET /api/config, which serves both
// public and admin callers and just includes extra fields for the latter).
export async function isValidAdminSecret(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-admin-secret");
  if (!provided) return false;

  const hash = await getStoredSecretHash();
  if (hash) return bcrypt.compare(provided, hash);

  const expected = process.env.ADMIN_SECRET;
  return !!expected && provided === expected;
}

// Full gate for admin-only routes: returns a ready-to-return error response,
// or null when the request is authorized.
export async function checkAdminAuth(req: Request): Promise<NextResponse | null> {
  const provided = req.headers.get("x-admin-secret");
  if (!provided) return unauthorized();

  const hash = await getStoredSecretHash();
  if (hash) {
    const ok = await bcrypt.compare(provided, hash);
    return ok ? null : unauthorized();
  }

  // No secret has been set from the admin panel yet — fall back to the
  // bootstrap env var. Fail closed if that isn't configured either, rather
  // than silently accepting anything.
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_SECRET belum diatur di server" },
      { status: 500 }
    );
  }
  return provided === expected ? null : unauthorized();
}

function unauthorized() {
  return NextResponse.json(
    { error: "Tidak diizinkan (admin secret salah atau kosong)" },
    { status: 401 }
  );
}
