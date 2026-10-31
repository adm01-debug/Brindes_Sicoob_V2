import { useEffect, useMemo, useRef, useState } from "react";
import { notificationsMetrics } from "@/lib/notifications-metrics";

/** Sliding-window length for the sparkline (60 samples × 1s = 60s). */
const SPARK_WINDOW_SECONDS = 60;
/** Suspicious threshold: ratio at/above this is considered "leaky coalescing". */
const SUSPICIOUS_RATIO_THRESHOLD = 0.7;
/** How many consecutive seconds the ratio must stay ≥ threshold to fire the warning. */
const SUSPICIOUS_STREAK_SECONDS = 10;

/** One ratio sample for the sparkline. */
export interface RatioSample { t: number; ratio: number; triggers: number; fetches: number; }

/** Trend fitted over the current suspicious streak window. */
export interface StreakTrend {
  direction: "rising" | "flat" | "falling";
  slopePerSec: number;
  suggestion: { primary: string; rationale: string } | null;
}

function trendSlope(window: RatioSample[]) {
  const xs = window.map((_, index) => index);
  const ys = window.map((sample) => sample.ratio);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / window.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / window.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < window.length; index++) {
    const x = xs[index];
    const y = ys[index];
    if (x === undefined || y === undefined) continue;
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function trendDirection(slope: number): StreakTrend['direction'] {
  if (slope >= 0.01) return 'rising';
  if (slope <= -0.01) return 'falling';
  return 'flat';
}

function trendSuggestion(direction: StreakTrend['direction']) {
  if (direction === 'rising') return { primary: "Try debounce 200ms → 400ms", rationale: "Ratio still climbing — widen the trailing-edge window first to absorb growing micro-bursts before touching the TTL gate." };
  if (direction === 'flat') return { primary: "Try TTL 5s → 10s (keep debounce 200ms)", rationale: "Ratio plateaued at a high level — debounce is firing per burst; raise the prefetch TTL gate so back-to-back bursts coalesce." };
  return { primary: "Hold values — ratio is self-recovering", rationale: "Trend is falling. Wait one more streak cycle before tuning to avoid over-correcting." };
}

function calculateStreakTrend(samples: RatioSample[], streakStartIndex: number): StreakTrend {
  if (streakStartIndex < 0) return { direction: 'flat', slopePerSec: 0, suggestion: null };
  const window = samples.slice(streakStartIndex);
  if (window.length < 3) return { direction: 'flat', slopePerSec: 0, suggestion: { primary: "Hold current values; need ≥3s of data to recommend.", rationale: "Streak too short to fit a trend line." } };
  const slopePerSec = trendSlope(window);
  const direction = trendDirection(slopePerSec);
  return { direction, slopePerSec, suggestion: trendSuggestion(direction) };
}

/** Read the runtime debug toggle (mirrors `isDebugEnabled` in notifications-metrics). */
function isDebugMode(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage?.getItem("debug:notifications") === "1") return true;
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

export function useNotificationsMetricsPanel(visible: boolean) {
  const [debugOn, setDebugOn] = useState(() => isDebugMode());
  const [snapshot, setSnapshot] = useState(() => notificationsMetrics.snapshot());
  /** Sliding-window samples (most recent at the END). */
  const [samples, setSamples] = useState<RatioSample[]>([]);
  const lastCountsRef = useRef<{ triggers: number; fetches: number }>({ triggers: 0, fetches: 0 });

  useEffect(() => {
    if (!visible) return;
    const initial = notificationsMetrics.snapshot();
    setSnapshot(initial);
    lastCountsRef.current = { triggers: initial.triggers, fetches: initial.fetches };

    const unsub = notificationsMetrics.subscribeBadgeRender(() => {
      setSnapshot(notificationsMetrics.snapshot());
    });
    const id = window.setInterval(() => {
      const snap = notificationsMetrics.snapshot();
      setSnapshot(snap);
      setDebugOn(isDebugMode());
      // Detect auto-reset (every 15 min) and clear samples so the sparkline
      // doesn't draw a phantom drop to 0.
      const prev = lastCountsRef.current;
      if (snap.triggers < prev.triggers || snap.fetches < prev.fetches) {
        setSamples([]);
      }
      lastCountsRef.current = { triggers: snap.triggers, fetches: snap.fetches };
      setSamples((prevSamples) => {
        const next = [
          ...prevSamples,
          { t: Date.now(), ratio: snap.ratio, triggers: snap.triggers, fetches: snap.fetches },
        ];
        return next.length > SPARK_WINDOW_SECONDS
          ? next.slice(next.length - SPARK_WINDOW_SECONDS)
          : next;
      });
    }, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [visible]);

  const sparkStats = useMemo(() => {
    if (samples.length === 0) return { avg: 0, min: 0, max: 0, latest: 0 };
    const ratios = samples.map((s) => s.ratio);
    const sum = ratios.reduce((a, b) => a + b, 0);
    return {
      avg: sum / ratios.length,
      min: Math.min(...ratios),
      max: Math.max(...ratios),
      latest: ratios[ratios.length - 1],
    };
  }, [samples]);

  const suspiciousStreakSeconds = useMemo(() => {
    let streak = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
      const s = samples[i];
      if (!s) break;
      if (s.triggers > 0 && s.ratio >= SUSPICIOUS_RATIO_THRESHOLD) streak += 1;
      else break;
    }
    return streak;
  }, [samples]);

  const isSuspicious = suspiciousStreakSeconds >= SUSPICIOUS_STREAK_SECONDS;
  
  const streakStartIdx = useMemo(() => {
    if (suspiciousStreakSeconds === 0) return -1;
    return samples.length - suspiciousStreakSeconds;
  }, [samples.length, suspiciousStreakSeconds]);

  const streakWindowStats = useMemo(() => {
    if (streakStartIdx < 0 || samples.length === 0) {
      return { triggers: 0, fetches: 0, ratio: 0, fromT: 0, toT: 0, seconds: 0 };
    }
    const first = samples[streakStartIdx];
    const last = samples[samples.length - 1];
    if (!first || !last) {
      return { triggers: 0, fetches: 0, ratio: 0, fromT: 0, toT: 0, seconds: 0 };
    }
    const before = streakStartIdx > 0 ? samples[streakStartIdx - 1] : null;
    const triggers = before
      ? Math.max(0, last.triggers - before.triggers)
      : last.triggers - first.triggers + first.triggers;
    const fetches = before
      ? Math.max(0, last.fetches - before.fetches)
      : last.fetches - first.fetches + first.fetches;
    const ratio = triggers === 0 ? 0 : fetches / triggers;
    return {
      triggers,
      fetches,
      ratio,
      fromT: first.t,
      toT: last.t,
      seconds: suspiciousStreakSeconds,
    };
  }, [samples, streakStartIdx, suspiciousStreakSeconds]);

  const streakTrend = useMemo(() => calculateStreakTrend(samples, streakStartIdx), [samples, streakStartIdx]);

  return {
    debugOn,
    snapshot,
    samples,
    sparkStats,
    isSuspicious,
    suspiciousStreakSeconds,
    streakWindowStats,
    streakTrend,
    streakStartIdx,
    SUSPICIOUS_RATIO_THRESHOLD,
    SUSPICIOUS_STREAK_SECONDS,
    SPARK_WINDOW_SECONDS
  };
}
