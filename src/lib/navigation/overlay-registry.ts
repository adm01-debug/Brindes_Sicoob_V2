import { trackUx } from '@/lib/uxMetrics';

const EXPLICIT_BLOCKING_OVERLAY = '[data-navigation-overlay="blocking"]';
const RADIX_OPEN_OVERLAY = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(', ');
const POPPER_WRAPPER = '[data-radix-popper-content-wrapper]';

function isVisible(element: Element): boolean {
  return element.getAttribute('data-state') !== 'closed'
    && element.getAttribute('aria-hidden') !== 'true';
}

function isBlockingPopper(wrapper: Element): boolean {
  if (!isVisible(wrapper)) return false;
  if (wrapper.querySelector('[role="tooltip"]')) return false;
  const content = wrapper.querySelector('[data-state]');
  return !content || content.getAttribute('data-state') !== 'closed';
}

/** Detecta overlays que precisam ser fechados antes de navegar. */
export function hasBlockingNavigationOverlay(): boolean {
  const explicit = Array.from(document.querySelectorAll(EXPLICIT_BLOCKING_OVERLAY));
  if (explicit.some(isVisible)) return true;
  if (document.querySelector(RADIX_OPEN_OVERLAY)) return true;
  return Array.from(document.querySelectorAll(POPPER_WRAPPER)).some(isBlockingPopper);
}

/** Fecha somente o overlay superior por meio do contrato comum de Escape. */
export function dismissBlockingNavigationOverlay(): boolean {
  if (!hasBlockingNavigationOverlay()) return false;
  trackUx('nav.overlay-dismiss');
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  }));
  return true;
}
