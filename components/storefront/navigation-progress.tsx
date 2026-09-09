"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top loading progress bar that gives instant visual feedback
 * the exact millisecond a user clicks any link or triggers navigation.
 * Automatically completes to 100% and cleanly fades out when navigation finishes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  // Store active timer IDs so we can cancel them cleanly
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Reset and complete loading state when route transition completes
  useEffect(() => {
    // If the progress bar was visible, complete it to 100% then fade out
    clearAllTimers();
    setProgress(100);

    const tFade = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 250);

    timersRef.current.push(tFade);

    return () => {
      clearAllTimers();
    };
  }, [pathname, searchParams]);

  // Intercept click on any internal link to trigger instant loading feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, anchor hashes, and new-tab links
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      // If already on the same exact pathname + search, don't trigger
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      // Clear any leftover timers from previous clicks
      clearAllTimers();

      // Start the progress animation immediately
      setIsVisible(true);
      setProgress(25);

      const t1 = setTimeout(() => setProgress(60), 100);
      const t2 = setTimeout(() => setProgress(85), 250);

      // Failsafe auto-complete: if navigation takes longer or is intercepted,
      // complete and hide after 3 seconds so the bar NEVER gets stuck
      const tFailsafe = setTimeout(() => {
        setProgress(100);
        const tHide = setTimeout(() => {
          setIsVisible(false);
          setProgress(0);
        }, 200);
        timersRef.current.push(tHide);
      }, 3000);

      timersRef.current.push(t1, t2, tFailsafe);
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      clearAllTimers();
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-red-500 via-red-600 to-amber-500 shadow-sm shadow-red-500/50 transition-all ease-out"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? (progress === 100 ? 0 : 1) : 0,
          transitionDuration: progress === 100 ? "200ms" : "150ms",
        }}
      />
    </div>
  );
}
