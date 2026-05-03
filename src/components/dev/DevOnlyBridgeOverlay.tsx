/**
 * Wrapper que monta o BridgeMetricsOverlay APENAS quando o gate SSOT
 * aprova acesso técnico de infra.
 *
 * O `lazy()` só dispara o import do overlay depois que o gate aprova,
 * então usuários comuns NUNCA baixam o chunk do painel técnico.
 */
import { Suspense, lazy, forwardRef } from 'react';
import { useDevGate } from '@/hooks/useDevGate';

const Overlay = lazy(() => import('./BridgeMetricsOverlay'));

export const DevOnlyBridgeOverlay = forwardRef<HTMLDivElement>((_props, ref) => {
  const { isAllowed } = useDevGate();
  
  if (!isAllowed) return null;
  
  return (
    <div ref={ref}>
      <Suspense fallback={null}>
        <Overlay />
      </Suspense>
    </div>
  );
});

DevOnlyBridgeOverlay.displayName = 'DevOnlyBridgeOverlay';
