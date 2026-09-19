import {
  pgTable,
  serial,
  varchar,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  text,
} from "drizzle-orm/pg-core";

export const officeConfig = pgTable("office_config", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radius: doublePrecision("radius").notNull(),
  // Optional comma-separated list of public IPs allowed to absen (the
  // office WiFi's WAN IP as seen by our server — browsers can't read a
  // WiFi's SSID directly). Null/empty disables this check entirely, so
  // leaving it blank never blocks anyone. See lib/client-ip.ts.
  allowedIp: varchar("allowed_ip", { length: 500 }),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  // bcrypt hash of the PIN — never the raw PIN. See lib/pin.ts.
  pinHash: varchar("pin_hash", { length: 100 }).notNull(),
  // 128-length face descriptor array from face-api.js, or null until registered
  descriptor: jsonb("descriptor").$type<number[] | null>(),
  // Small (~160x160, compressed) reference photo captured at the same
  // moment as the descriptor above, as a "data:image/jpeg;base64,..." URL.
  // Shown side-by-side with the live capture at absen time so a human can
  // visually sanity-check a match/mismatch — not used for the actual face
  // comparison itself (that's still the descriptor). Nullable because
  // employees registered before this field existed won't have one.
  facePhoto: text("face_photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // 'masuk' | 'pulang'
  ts: timestamp("ts").defaultNow().notNull(),
  dateKey: varchar("date_key", { length: 10 }).notNull(), // YYYY-MM-DD
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  distance: integer("distance"),
});
