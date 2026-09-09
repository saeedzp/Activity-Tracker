"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once the page is interactive.
 *
 * Employees work inside stores where signal drops, so the shell needs to keep
 * opening. Registration failing is not worth surfacing: the app works without
 * it, just not offline.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
