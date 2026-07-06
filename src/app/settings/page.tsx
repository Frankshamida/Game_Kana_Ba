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
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">App Settings</h1>

        <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-5 dark:border-slate-700/80 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold">Theme</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Switch between light and dark mode
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                isDarkMode
                  ? "bg-slate-800 text-slate-100 dark:bg-slate-700"
                  : "bg-cyan-100 text-cyan-800"
              }`}
            >
              {isDarkMode ? "Dark" : "Light"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/70 bg-slate-100/80 p-2 dark:border-slate-700/70 dark:bg-slate-900/85">
            <div
              role="group"
              aria-label="Theme mode"
              className="grid h-14 grid-cols-2 gap-2 rounded-xl border border-slate-300/70 bg-white/80 p-1 dark:border-slate-700/70 dark:bg-slate-950/70"
            >
              <button
                type="button"
                onClick={() => applyTheme(false)}
                aria-pressed={!isDarkMode}
                className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  !isDarkMode
                    ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-300/70 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-500/70"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
                    ? "bg-slate-900 text-white shadow-md ring-1 ring-slate-600/80 dark:bg-slate-800 dark:ring-slate-500/80"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <Moon className="h-4 w-4" /> Dark
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="mt-3 w-full rounded-lg border border-transparent py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-slate-300/70 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
            >
              Tap here to toggle quickly
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
