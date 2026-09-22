import { useEffect, useRef } from 'react';
import { useSmartNavigation } from './useSmartNavigation';

export function useSwipeBack(enabled = true) {
  const { goBack } = useSmartNavigation();
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const minSwipeDistance = 50;
    const maxVerticalDistance = 30;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      // Só capturar se começar na borda esquerda (ex: primeiros 30px)
      if (touch.clientX < 40) { // Increased hit area for easier swipe
        touchStartRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
        touchEndRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchEndRef.current = touch.clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !touchEndRef.current) return;

      const distance = touchEndRef.current - touchStartRef.current;
      const isRightSwipe = distance > minSwipeDistance;
      const changedTouch = e.changedTouches[0];
      const verticalDistance = changedTouch
        ? Math.abs(changedTouch.clientY - (touchStartYRef.current ?? 0))
        : 0;

      if (isRightSwipe && verticalDistance < maxVerticalDistance) {
        goBack();
      }

      touchStartRef.current = null;
      touchStartYRef.current = null;
      touchEndRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, goBack]);
}
