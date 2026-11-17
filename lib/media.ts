import { useSyncExternalStore } from "react";

/** Live result of a CSS media query; false on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** "dark" or "light", following the system setting. */
export function useColorScheme(): "dark" | "light" {
  return useMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light";
}
