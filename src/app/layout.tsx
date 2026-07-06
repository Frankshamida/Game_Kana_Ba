import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who's the Impostor? | Party Games",
  description: "A modern party game where one player gets only a clue.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
        {children}
      </body>
    </html>
  );
}
