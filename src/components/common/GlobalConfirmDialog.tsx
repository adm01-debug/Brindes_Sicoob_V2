import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

/**
 * Diálogo global de confirmação — substitui `window.confirm`.
 * Montado uma vez no MainLayout; acionado via `askConfirm({...})`.
 */
export function GlobalConfirmDialog() {
  const request = useConfirmDialogStore((s) => s.request);
  const resolve = useConfirmDialogStore((s) => s.resolve);

  return (
    <ConfirmDialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) resolve(false);
      }}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel ?? 'Confirmar'}
      cancelLabel={request?.cancelLabel ?? 'Cancelar'}
      variant={request?.variant ?? 'default'}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
      testId="global-confirm-dialog"
    />
  );
}
