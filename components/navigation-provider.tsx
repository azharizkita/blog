"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";

const NavigationContext = createContext<{
  checkInternalHistory: () => boolean;
}>({
  checkInternalHistory: () => false,
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Track navigation history in localStorage
    const NAVIGATION_KEY = "nav_history";

    // Get existing history
    const existingHistory = localStorage.getItem(NAVIGATION_KEY);
    let history: string[] = existingHistory ? JSON.parse(existingHistory) : [];

    // Add current path to history (avoid duplicates of consecutive same paths)
    if (history[history.length - 1] !== pathname) {
      history.push(pathname);

      // Keep only last 10 entries to avoid bloating localStorage
      if (history.length > 10) {
        history = history.slice(-10);
      }

      localStorage.setItem(NAVIGATION_KEY, JSON.stringify(history));
    }
  }, [pathname]);

  const checkInternalHistory = () => {
    const NAVIGATION_KEY = "nav_history";
    const history = localStorage.getItem(NAVIGATION_KEY);

    if (!history) return false;

    const parsedHistory: string[] = JSON.parse(history);

    // Check if we have more than just the current page in our internal history
    return parsedHistory.length > 1;
  };

  return (
    <NavigationContext.Provider value={{ checkInternalHistory }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);