# Absensi Kantor

Project Next.js (App Router) + Drizzle ORM + Neon Postgres yang siap dijalankan/deploy sendiri, untuk absensi masuk/pulang 7 pegawai pakai face recognition + geolocation.

## Isi
- `lib/schema.ts` — skema Drizzle: `office_config`, `employees` (PIN disimpan sebagai `pinHash`, bukan plaintext), `attendance`
- `lib/db.ts` — koneksi Drizzle ke Neon
- `lib/pin.ts` — hash & verifikasi PIN pakai bcrypt (`bcryptjs`)
- `lib/admin-auth.ts` — gate shared-secret sederhana (`ADMIN_SECRET`) untuk endpoint admin
- `app/api/config/route.ts` — GET (publik, dipakai halaman pegawai untuk geofence) & POST (admin) lokasi & radius kantor
- `app/api/employees/route.ts` — GET list & POST tambah pegawai (maks 7) — keduanya butuh admin
- `app/api/employees/[id]/route.ts` — PATCH simpan face descriptor, DELETE hapus pegawai — butuh admin
- `app/api/login/route.ts` — POST cek username + PIN (bandingkan hash)
- `app/api/attendance/route.ts` — GET riwayat / cek absen hari ini, POST catat absen (publik untuk pegawai yang sudah login)
- `public/absensi.html` — halaman statis (UI + logic kamera, geolocation, pengenalan wajah pakai face-api.js dari CDN, gate admin secret) — bisa diakses di `/absensi.html`; `/` otomatis redirect ke situ.
- `drizzle.config.ts`, `neon.ts`, `.neon` — config Drizzle Kit & Neon project (branch `production`) yang sudah di-provision.

## Setup lokal

1. `npm install`
2. `.env.local` sudah berisi `DATABASE_URL` (dari provisioning Neon) dan `ADMIN_SECRET` (digenerate otomatis). Kalau perlu generate ulang `ADMIN_SECRET`: `openssl rand -hex 32`.
3. Push skema ke database (sudah dijalankan sekali — jalankan lagi kalau `lib/schema.ts` berubah):
   ```bash
   npm run db:push
   ```
4. `npm run dev` lalu buka `http://localhost:3000/absensi.html`.

## Deploy ke Vercel

1. Push repo ini ke Git (GitHub/GitLab/Bitbucket), lalu `vercel` atau import lewat dashboard Vercel.
2. Di Vercel → Project Settings → Environment Variables, tambahkan **persis** yang ada di `.env.local`:
   - `DATABASE_URL`
   - `ADMIN_SECRET`
   (`.env.local` sendiri tidak pernah ikut ter-commit — sudah di-`.gitignore`.)
3. Deploy. Setelah live, buka `https://domainmu.vercel.app/absensi.html` di HP yang sedang berada di kantor, masuk ke tab **Admin** (masukkan `ADMIN_SECRET` saat diminta — sama dengan yang di-set di step 2), set lokasi kantor, tambah 7 pegawai, dan daftarkan wajah masing-masing.

Sudah diverifikasi end-to-end di sesi ini: `npm run build` sukses, `npm run db:push` berhasil membuat tabel `office_config`/`employees`/`attendance` di Neon, dan seluruh endpoint (`config`, `employees`, `employees/[id]`, `login`, `attendance`) dites lewat `curl` terhadap server yang benar-benar jalan — termasuk gate admin (401 tanpa secret), gate wajah-belum-terdaftar, batas 7 pegawai, dan cek username unik. Data uji coba sudah dibersihkan dari database sebelum diserahkan.

## Catatan penting

- **PIN sudah di-hash dengan bcrypt** (`lib/pin.ts`, kolom `pinHash`) — tidak lagi disimpan plaintext, dan dibandingkan lewat `bcrypt.compare` saat login.
- **Tab Admin sekarang digerbangi `ADMIN_SECRET`** (`lib/admin-auth.ts`) — satu secret dikirim lewat header `x-admin-secret` dan dicek di server sebelum mengizinkan ubah lokasi kantor / CRUD pegawai / daftar wajah. Ini **bukan** pengganti auth sungguhan: satu secret dipakai bersama untuk semua admin, tidak ada audit log per-user. Begitu file-file ini ditempel ke project asli yang sudah punya `better-auth`, ganti `checkAdminAuth()` di `lib/admin-auth.ts` dengan pengecekan session + role admin/HR dari `better-auth`, lalu hapus form "Login Admin" di `absensi.html` (proteksi cukup lewat middleware/route Next.js seperti halaman admin lain).
- **Model pengenalan wajah** (`face-api.js`) di-load dari CDN jsdelivr saat halaman dibuka — butuh koneksi internet, dan ambang kecocokan (`MATCH_THRESHOLD = 0.55`) bisa disesuaikan di `public/absensi.html` kalau terlalu ketat/longgar.
- **Riwayat & daftar pegawai tidak realtime** — data di-fetch ulang tiap kali tab dibuka. Kalau perlu update otomatis, tambahkan polling (`setInterval`) atau ganti ke sistem realtime seperti Pusher/Ably.
- Query `attendance` per pegawai per hari dipakai untuk menentukan otomatis apakah ini absen "masuk" atau "pulang" — logikanya ada di `recordAttendance()` pada `absensi.html`.
