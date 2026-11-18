import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

/**
 * Devolve o foco para quem abriu a confirmação.
 *
 * O AlertDialog rouba o foco ao montar e, sem trigger (o pedido vem do store,
 * não de um botão do Radix), no fechamento o foco cai no `body` — o teclado
 * perde o lugar depois de cada uma das confirmações. O elemento é capturado na
 * renderização em que o pedido aparece, antes de o conteúdo do diálogo montar,
 * e devolvido quando o pedido termina. Funciona também com a confirmação aberta
 * sobre outro diálogo, porque restaura o elemento real, não um trigger.
 */
function useOpenerFocusRestore(isOpen: boolean): void {
  const opener = useRef<HTMLElement | null>(null);

  if (isOpen && !opener.current && typeof document !== 'undefined') {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }

  useEffect(() => {
    if (isOpen) return;
    const previous = opener.current;
    opener.current = null;
    if (previous && document.body.contains(previous)) previous.focus();
  }, [isOpen]);
}

/**
 * Diálogo global de confirmação — substitui `window.confirm`.
 * Montado uma vez no MainLayout; acionado via `askConfirm({...})`.
 */
export function GlobalConfirmDialog() {
  const location = useLocation();
  const request = useConfirmDialogStore((s) => s.request);
  const resolve = useConfirmDialogStore((s) => s.resolve);
  const cancelCurrent = useConfirmDialogStore((s) => s.cancelCurrent);
  const previousLocationKey = useRef(location.key);
  useOpenerFocusRestore(Boolean(request));

  useEffect(() => {
    if (previousLocationKey.current !== location.key) {
      cancelCurrent();
      previousLocationKey.current = location.key;
    }
  }, [cancelCurrent, location.key]);

  useEffect(() => () => cancelCurrent(), [cancelCurrent]);

  if (!request) return null;

  const finish = (confirmed: boolean) => {
    resolve(request.id, confirmed);
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
      title={request.title}
      description={request.description}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      variant={request.variant}
      onConfirm={() => finish(true)}
      onCancel={() => finish(false)}
      testId="global-confirm-dialog"
    />
  );
}
