import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { HubsProvider } from "@/components/HubsProvider";
import { LangProvider } from "@/components/LangProvider";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RickshawShare Dhaka — বনশ্রী-রামপুরা রিকশা পুল",
  description:
    "Share a rickshaw with a fellow office-goer at fixed landmarks along the Rampura–Banasree–Meradia–Aftab Nagar corridor and cut your fare by half.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "RickshawShare", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="bg-zinc-950 font-sans text-slate-100 antialiased">
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <HubsProvider>{children}</HubsProvider>
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
