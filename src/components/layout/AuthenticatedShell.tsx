import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppProviders } from '@/components/providers/AppProviders';
import { BridgeStatusBanner } from '@/components/system/BridgeStatusBanner';
import { CloudStatusBanner } from '@/components/system/CloudStatusBanner';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';
import { AuthDiagnosticsWidget } from '@/components/dev/AuthDiagnosticsWidget';
import { DiagnosticOverlay } from '@/components/dev/DiagnosticOverlay';
import { useCatalogPrefetch } from '@/hooks/useCatalogPrefetch';
import { startBridgeTelemetry } from '@/lib/external-db/bridge-telemetry-client';
import { startColdStartRecorder } from '@/lib/external-db/cold-start-recorder';

/**
 * Infraestrutura exclusiva da área autenticada.
 *
 * Mantê-la fora da árvore pública evita que o login transfira e execute o
 * catálogo externo, painéis técnicos e telemetria de bridge antes de haver
 * uma sessão válida.
 */
export function AuthenticatedShell() {
  useCatalogPrefetch();

  useEffect(() => {
    const stopBridgeTelemetry = startBridgeTelemetry();
    const stopColdStartRecorder = startColdStartRecorder();

    return () => {
      stopBridgeTelemetry();
      stopColdStartRecorder();
    };
  }, []);

  return (
    <AppProviders>
      <CloudStatusBanner />
      <BridgeStatusBanner />
      <DevOnlyBridgeOverlay />
      <AuthDiagnosticsWidget />
      <DiagnosticOverlay />
      <Outlet />
    </AppProviders>
  );
}
