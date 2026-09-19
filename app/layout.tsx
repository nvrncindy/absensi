import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Absensi Kantor",
  description: "Absensi masuk/pulang pegawai dengan face recognition + geolocation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
