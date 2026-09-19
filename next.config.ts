import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. Without this, Next.js/Turbopack
  // walks up looking for a lockfile and can pick up an unrelated
  // package-lock.json/package.json sitting in the parent (home) directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        // absensi.html changes often during development (face-match
        // threshold, UI tweaks) and is opened repeatedly on the same phone
        // browsers at the office. Without this, browsers/mobile Safari can
        // keep serving a stale cached copy after a deploy, silently running
        // old logic (e.g. an old match-percent threshold) that looks like a
        // server bug but is actually just a cached asset.
        source: "/absensi.html",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
