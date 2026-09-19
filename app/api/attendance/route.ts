import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendance, officeConfig } from "@/lib/schema";
import { desc, eq, and, like, asc } from "drizzle-orm";
import { checkAdminAuth } from "@/lib/admin-auth";
import { getClientIp, isIpAllowed } from "@/lib/client-ip";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const dateKey = searchParams.get("dateKey");
  const month = searchParams.get("month"); // "YYYY-MM" — monthly report export
  const limit = Number(searchParams.get("limit") || "100");

  // Monthly report (one employee, or all of them) for the admin "Laporan
  // Bulanan" export — always cross-checks against real data, so admin only.
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Format bulan tidak valid (YYYY-MM)" }, { status: 400 });
    }
    const authError = await checkAdminAuth(req);
    if (authError) return authError;

    const conditions = [like(attendance.dateKey, `${month}-%`)];
    if (employeeId) conditions.push(eq(attendance.employeeId, Number(employeeId)));

    const rows = await db
      .select()
      .from(attendance)
      .where(and(...conditions))
      .orderBy(attendance.dateKey, attendance.employeeId);
    return NextResponse.json(rows);
  }

  // Scoped to a single employee (today's status check, or that employee's
  // own recent history right after they log in with username+PIN) — safe
  // without admin since it's already narrowed to one employeeId.
  if (employeeId) {
    let rows;
    if (dateKey) {
      rows = await db
        .select()
        .from(attendance)
        .where(
          and(eq(attendance.employeeId, Number(employeeId)), eq(attendance.dateKey, dateKey))
        );
    } else {
      rows = await db
        .select()
        .from(attendance)
        .where(eq(attendance.employeeId, Number(employeeId)))
        .orderBy(desc(attendance.ts))
        .limit(limit);
    }
    return NextResponse.json(rows);
  }

  // Full cross-employee history — admin only.
  const authError = await checkAdminAuth(req);
  if (authError) return authError;

  const rows = await db.select().from(attendance).orderBy(desc(attendance.ts)).limit(limit);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { employeeId, employeeName, type, dateKey, lat, lng, distance } = body;

  if (!employeeId || !employeeName || !["masuk", "pulang"].includes(type) || !dateKey) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  // Server-side source of truth for the office-WiFi restriction — the
  // client-side check in absensi.html is only there for a fast/friendly
  // message, never trusted on its own since it's easy to bypass client-side.
  const [cfg] = await db.select().from(officeConfig).orderBy(asc(officeConfig.id)).limit(1);
  if (cfg && !isIpAllowed(getClientIp(req), cfg.allowedIp)) {
    return NextResponse.json(
      { error: "Perangkat ini tidak terhubung ke WiFi kantor" },
      { status: 403 }
    );
  }

  const [row] = await db
    .insert(attendance)
    .values({ employeeId, employeeName, type, dateKey, lat, lng, distance })
    .returning();
  return NextResponse.json(row);
}
