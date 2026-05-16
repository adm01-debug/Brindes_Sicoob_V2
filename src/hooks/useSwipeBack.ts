import { useEffect, useRef } from 'react';
import { useSmartNavigation } from './useSmartNavigation';

export function useSwipeBack(enabled = true) {
  const { goBack } = useSmartNavigation();
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const minSwipeDistance = 50;
    const maxVerticalDistance = 30;

    const onTouchStart = (e: TouchEvent) => {
      // Só capturar se começar na borda esquerda (ex: primeiros 30px)
      if (e.touches[0].clientX < 40) { // Increased hit area for easier swipe
        touchStartRef.current = e.touches[0].clientX;
        (touchStartRef as any).current_y = e.touches[0].clientY;
        touchEndRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      touchEndRef.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !touchEndRef.current) return;

      const distance = touchEndRef.current - touchStartRef.current;
      const isRightSwipe = distance > minSwipeDistance;
      const verticalDistance = Math.abs(e.changedTouches[0].clientY - (touchStartRef.current_y || 0));

      if (isRightSwipe && verticalDistance < maxVerticalDistance) {
        goBack();
      }

      touchStartRef.current = null;
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
