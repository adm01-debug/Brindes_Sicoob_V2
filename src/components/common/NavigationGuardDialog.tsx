import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

/**
 * Diálogo global de confirmação de saída com alterações não salvas.
 * Montado uma única vez no layout; qualquer fluxo de navegação pode pedir
 * confirmação via `useNavigationGuardStore.requestConfirmation()`.
 */
export function NavigationGuardDialog() {
  const request = useNavigationGuardStore((s) => s.request);
  const resolve = useNavigationGuardStore((s) => s.resolve);

  return (
    <UnsavedChangesDialog
      open={Boolean(request)}
      message={request?.message}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
      // z-[110]: precisa ficar acima do tour de onboarding (z-[100]) para
      // continuar visível/clicável quando a guarda dispara durante o tour.
      contentClassName="z-[110]"
    />
  );
}
