"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const applyTheme = (nextDarkMode: boolean) => {
    setIsDarkMode(nextDarkMode);
    document.documentElement.classList.toggle("dark", nextDarkMode);
    localStorage.setItem("theme", nextDarkMode ? "dark" : "light");
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const nextDarkMode =
      storedTheme === "dark" ||
      (!storedTheme && document.documentElement.classList.contains("dark"));

    setIsDarkMode(nextDarkMode);
    document.documentElement.classList.toggle("dark", nextDarkMode);
  }, []);

  const toggleTheme = () => {
    applyTheme(!isDarkMode);
  };

  return (
    <main className="px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-3xl rounded-3xl p-6 glass">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">App Settings</h1>

        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                isDarkMode
                  ? "bg-muted text-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {isDarkMode ? "Dark" : "Light"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-muted p-2">
            <div
              role="group"
              aria-label="Theme mode"
              className="grid h-14 grid-cols-2 gap-2 rounded-xl border border-border bg-card/80 p-1"
            >
              <button
                type="button"
                onClick={() => applyTheme(false)}
                aria-pressed={!isDarkMode}
                className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  !isDarkMode
                    ? "bg-card text-foreground shadow-md ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Sun className="h-4 w-4" /> Light
              </button>

              <button
                type="button"
                onClick={() => applyTheme(true)}
                aria-pressed={isDarkMode}
                className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  isDarkMode
                    ? "bg-foreground text-background shadow-md ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Moon className="h-4 w-4" /> Dark
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="mt-3 w-full rounded-lg border border-transparent py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              Tap here to toggle quickly
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
