/**
 * Detecção de overlays flutuantes descartáveis (Radix DismissableLayer):
 * dialogs, alert-dialogs, dropdowns/menus, selects, popovers, hover-cards
 * e tooltips — o conteúdo flutuante desses componentes recebe
 * `data-radix-popper-content-wrapper` ou role dialog/menu/listbox com
 * `data-state="open"`.
 */
export const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper]',
].join(', ');

/** Há algum overlay flutuante aberto na página? */
export function hasOpenOverlay(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

/**
 * Dispara Escape para que o DismissableLayer do Radix feche o overlay
 * do topo da pilha. Retorna true se havia overlay aberto.
 */
export function dismissTopmostOverlay(): boolean {
  if (!hasOpenOverlay()) return false;
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
  return true;
}
