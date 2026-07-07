import type { Metadata } from "next";
import Script from "next/script";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GatherUp",
    template: "%s | GatherUp",
  },
  description: "Play. Laugh. Connect.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GatherUp",
    statusBarStyle: "black-translucent",
  },
  applicationName: "GatherUp",
  openGraph: {
    type: "website",
    siteName: "GatherUp",
    images: ["/og-impostor-invite.svg"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-impostor-invite.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = localStorage.getItem("theme");
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const useDark = stored ? stored === "dark" : prefersDark;
              document.documentElement.classList.toggle("dark", useDark);
            } catch {}
          })();`}
        </Script>
        <InstallPrompt />
        <div className="flex-1 pb-28 md:pb-14">{children}</div>
        <MobileNavbar />
        <footer className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/40 bg-white/35 px-4 py-3 text-center text-xs text-slate-700 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/45 dark:text-slate-300 md:block">
          Copyright © {currentYear} Frank Gomes. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
