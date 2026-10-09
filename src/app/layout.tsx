import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { HubsProvider } from "@/components/HubsProvider";
import { LangProvider } from "@/components/LangProvider";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/ThemeProvider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const DESCRIPTION =
  "Share a rickshaw with a fellow office-goer at fixed landmarks along the Rampura–Banasree–Meradia–Aftab Nagar corridor and split the fare.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — বনশ্রী-রামপুরা রিকশা পুল`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — share a rickshaw in Dhaka`,
    description: DESCRIPTION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "RickshawMate: Share. Save. Commute." }],
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: DESCRIPTION, images: ["/og.jpg"] },
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
