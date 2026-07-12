import type { Metadata } from "next";
import Script from "next/script";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { getSiteUrl } from "@/lib/site-url";
import logo from "./public/Logo/GatherUp.webp";
import "./globals.css";
import { NetworkStatusModal } from "../components/ui/network-status-modal";

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
    startupImage: {
      url: "/startup-image",
    },
  },
  applicationName: "GatherUp",
  icons: {
    icon: [{ url: logo.src, type: "image/webp", sizes: "any" }],
    apple: [{ url: logo.src, type: "image/webp", sizes: "any" }],
  },
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-[100dvh] flex-col overflow-x-hidden">
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
        <NetworkStatusModal />
        <InstallPrompt />
        <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[env(safe-area-inset-top)] lg:pb-14">
          {children}
        </div>
        <MobileNavbar />
        <footer className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-border/60 bg-background/60 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-md lg:block">
          Copyright © {currentYear} Frank Gomes. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
