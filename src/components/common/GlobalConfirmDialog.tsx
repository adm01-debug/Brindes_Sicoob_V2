import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

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
