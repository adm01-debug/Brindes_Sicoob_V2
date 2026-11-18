import { diagnostics } from '@/lib/diagnostics';

// KPIs de navegação/UX do plano: contadores em memória por sessão,
// inspecionáveis via getUxMetrics() (console/admin) e espelhados como
// eventos no DiagnosticsManager.
export type UxMetric =
  | 'nav.back'            // voltar executado de fato (mudou de página)
  | 'nav.overlay-dismiss' // voltar consumido fechando modal/menu aberto
  | 'nav.forward'         // navegação explícita para frente
  | 'nav.history-jump'    // salto multi-passo pelo menu de histórico
  | 'nav.scroll-restore'  // posição de scroll restaurada ao voltar
  | 'guard.shown'         // diálogo de alterações não salvas exibido
  | 'guard.confirm'       // usuário confirmou sair
  | 'guard.cancel';       // usuário ficou na página

const counters = new Map<UxMetric, number>();

export function trackUx(metric: UxMetric, data?: Record<string, unknown>): void {
  counters.set(metric, (counters.get(metric) ?? 0) + 1);
  diagnostics.log('event', 'ux-nav', metric, data);
}

export function getUxMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}

// Expõe os KPIs no console como o DiagnosticsManager faz (__DIAGNOSTICS__),
// para inspeção via `__UX_METRICS__()` e por painéis de telemetria.
if (typeof window !== 'undefined') {
  (window as unknown as { __UX_METRICS__: typeof getUxMetrics }).__UX_METRICS__ = getUxMetrics;
}
