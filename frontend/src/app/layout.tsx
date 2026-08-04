import "./globals.css";

export const metadata = {
  title: "SIMPATIK",
  description: "Sistem Monitoring dan Pelaporan Kepatuhan Internal Keimigrasian",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
