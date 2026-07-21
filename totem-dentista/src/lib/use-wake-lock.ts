import { useEffect } from "react";

interface WakeLockSentinelLike extends EventTarget {
  release: () => Promise<void>;
}

export function useWakeLock() {
  useEffect(() => {
    let wakeLock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const nav = navigator as unknown as {
          wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
        };
        if (nav.wakeLock?.request) {
          wakeLock = await nav.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            wakeLock = null;
          });
        }
      } catch {
        // ignored
      }
    };

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === "visible" && !wakeLock) {
        void request();
      }
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        void wakeLock?.release();
      } catch {
        // ignore
      }
      wakeLock = null;
    };
  }, []);
}
