import { useState, useEffect, useCallback, useRef } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void>, options = { threshold: 80 }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull to refresh if at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].pageY;
      isDragging.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      // Resistance effect
      const pull = Math.min(distance * 0.4, options.threshold + 20);
      setPullDistance(pull);
      
      // Prevent scrolling while pulling
      if (pull > 5 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing, options.threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= options.threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(options.threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, options.threshold]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
