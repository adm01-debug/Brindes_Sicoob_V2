import { useEffect } from "react";

const DATA_STATE_ATTRIBUTE = 'data-state';

/**
 * Scroll-lock fix v9 — Minimal observer, no layout thrashing.
 * 
 * Only listens for `data-state` attribute changes (not childList)
 * to detect overlay close transitions. Avoids getComputedStyle to
 * prevent forced reflows.
 */

function hasActiveOverlay(): boolean {
  const selectors = [
    '[data-state="open"][role="dialog"]',
    '[data-state="open"][role="alertdialog"]',
    '[vaul-drawer][data-state="open"]',
  ];

  for (const sel of selectors) {
    if (document.querySelector(sel)) return true;
  }

  return false;
}

function cleanupScrollLock() {
  if (hasActiveOverlay()) return;

  for (const element of [document.documentElement, document.body]) resetScrollStyles(element);

  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      document.body.classList.remove(cls);
    }
  });
}

function resetScrollStyles(element: HTMLElement): void {
  element.removeAttribute('data-scroll-locked');
  const style = element.style;
  const properties = [
    { name: 'overflow', active: style.overflow === 'hidden' },
    { name: 'overflow-y', active: style.overflowY === 'hidden' },
    { name: 'position', active: style.position === 'fixed' },
    { name: 'margin-right', active: Boolean(style.marginRight) },
    { name: 'padding-right', active: Boolean(style.paddingRight) },
    { name: 'touch-action', active: style.touchAction === 'none' },
    { name: 'pointer-events', active: style.pointerEvents === 'none' },
    { name: 'top', active: Boolean(style.top) && style.position !== 'fixed' },
    { name: 'width', active: style.width === '100%' && element === document.body },
  ];
  for (const property of properties) {
    if (property.active) style.removeProperty(property.name);
  }
}

export function useScrollLockFix() {
  useEffect(() => {
    let scheduled = false;

    const scheduleCleanup = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        cleanupScrollLock();
        scheduled = false;
      });
    };

    // Only watch data-state attribute changes — no childList to reduce noise
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === DATA_STATE_ATTRIBUTE) {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute(DATA_STATE_ATTRIBUTE) === 'closed') {
            scheduleCleanup();
            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: [DATA_STATE_ATTRIBUTE],
    });

    // One-time initial cleanup
    cleanupScrollLock();

    return () => observer.disconnect();
  }, []);
}
