"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

function preferredDarkTheme() {
  const savedTheme = window.localStorage.getItem("simpatik-theme");
  if (savedTheme) return savedTheme === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  useEffect(() => {
    const useDarkTheme = preferredDarkTheme();
    document.documentElement.classList.toggle("dark", useDarkTheme);
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("simpatik-theme", nextDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Ganti tema warna"
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </button>
  );
}
