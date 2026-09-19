// Browsers don't expose which WiFi network a device is on (SSID lookups
// require native/OS-level APIs, not something a web page can do). The
// practical stand-in used here: every device behind the same office
// router/WiFi shares one public IP as seen by our server, so we compare
// against that instead. This only works if the office's public IP is
// stable — if the ISP rotates it, admin needs to re-detect it (see the
// "Pakai IP saya sekarang" button in the admin panel).

export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

// `allowedIpsCsv` empty/null means the feature is off — never blocks
// anyone unless an admin has actually configured it.
export function isIpAllowed(clientIp: string | null, allowedIpsCsv: string | null | undefined): boolean {
  const allowed = (allowedIpsCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  if (!clientIp) return false;
  return allowed.includes(clientIp);
}
