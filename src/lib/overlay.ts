/**
 * Detecção de overlays flutuantes descartáveis (Radix DismissableLayer):
 * dialogs, alert-dialogs, dropdowns/menus, selects, popovers e hover-cards.
 * Tooltips são excluídos: são informativos e não devem bloquear nem
 * atrasar a navegação (ex.: tooltip do próprio botão Voltar).
 */
export const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(', ');

// Popover/HoverCard/Select/Tooltip abrem num wrapper Popper comum; o tipo
// do conteúdo decide se conta como overlay interativo.
const POPPER_WRAPPER_SELECTOR = '[data-radix-popper-content-wrapper]';

function isInteractivePopperWrapper(wrapper: Element): boolean {
  // Wrapper cujo único conteúdo é um tooltip não é overlay interativo.
  if (wrapper.querySelector('[role="tooltip"]')) return false;
  // Conteúdo em animação de fechamento já não deve segurar a navegação.
  const content = wrapper.querySelector('[data-state]');
  return content?.getAttribute('data-state') !== 'closed';
}

/** Há algum overlay flutuante aberto na página? */
export function hasOpenOverlay(): boolean {
  if (document.querySelector(OPEN_OVERLAY_SELECTOR)) return true;
  for (const wrapper of document.querySelectorAll(POPPER_WRAPPER_SELECTOR)) {
    if (isInteractivePopperWrapper(wrapper)) return true;
  }
  return false;
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
