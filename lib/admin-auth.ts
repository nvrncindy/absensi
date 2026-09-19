import { NextResponse } from "next/server";

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
 * Usage: set ADMIN_SECRET to a long random string (e.g. `openssl rand -hex
 * 32`) in the environment, and send it back on admin requests as the
 * `x-admin-secret` header.
 */
export function checkAdminAuth(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    // Fail closed: never allow admin actions if no secret is configured,
    // rather than silently accepting anything.
    return NextResponse.json(
      { error: "ADMIN_SECRET belum diatur di server" },
      { status: 500 }
    );
  }

  const provided = req.headers.get("x-admin-secret");
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { error: "Tidak diizinkan (admin secret salah atau kosong)" },
      { status: 401 }
    );
  }

  return null;
}
