import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: { default: "GhostWrench · Bottle the expert before they retire", template: "%s · GhostWrench" },
  description: "Voice-first knowledge capture for retiring factory technicians: talk, and it becomes a repair guide anyone can ask. Hindi, Kannada, English.",
  applicationName: "GhostWrench",
  appleWebApp: { capable: true, title: "GhostWrench", statusBarStyle: "black-translucent" },
  openGraph: { title: "GhostWrench", description: "Bottle the expert before they retire.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0a0c0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
