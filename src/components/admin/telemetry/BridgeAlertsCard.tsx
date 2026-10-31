/**
 * Card de alertas configuráveis por bridge no /admin/telemetria.
 *
 * - Lista alertas ativos (warn/crit) calculados a partir das amostras
 *   client-side já coletadas em bridgeCallMetrics.
 * - Permite o admin editar limiares de p95 (ms) e tamanho médio de resposta
 *   (KB) por bridge — persistidos em localStorage.
 * - Dispara toast quando um novo alerta aparece (uma vez por chave).
 */
import { useSyncExternalStore, useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Settings2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateByEndpoint,
  getBridgeSamples,
  subscribeBridgeCalls,
  type BridgeName,
} from '@/lib/telemetry/bridgeCallMetrics';
import {
  getThresholds,
  subscribeThresholds,
  setThresholds,
  resetThresholds,
  evaluateAlerts,
  type BridgeAlert,
} from '@/lib/telemetry/bridgeAlertThresholds';

const BRIDGES: { id: BridgeName; label: string }[] = [
  { id: 'external-db-bridge', label: 'External DB' },
  { id: 'crm-db-bridge', label: 'CRM DB' },
];

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function getAlertCardClass(criticalCount: number, warningCount: number): string {
  if (criticalCount > 0) return 'border-destructive/40 bg-destructive/5';
  if (warningCount > 0) return 'border-warning/40 bg-warning/5';
  return '';
}

function useBridgeAlerts() {
  const samples = useSyncExternalStore(subscribeBridgeCalls, getBridgeSamples, getBridgeSamples);
  const thresholds = useSyncExternalStore(subscribeThresholds, getThresholds, getThresholds);
  const rows = useMemo(() => aggregateByEndpoint(samples), [samples]);
  const alerts = useMemo(() => evaluateAlerts(rows, thresholds), [rows, thresholds]);
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const alert of alerts) {
      if (seenRef.current.has(alert.key)) continue;
      seenRef.current.add(alert.key);
      if (!thresholds[alert.bridge].toastEnabled) continue;
      const notify = alert.severity === 'crit' ? toast.error : toast.warning;
      notify(`[${alert.bridge}] ${alert.message}`, { description: `${alert.count} amostras` });
    }
    const active = new Set(alerts.map(alert => alert.key));
    for (const key of Array.from(seenRef.current)) if (!active.has(key)) seenRef.current.delete(key);
  }, [alerts, thresholds]);
  return { alerts, thresholds };
}

function BridgeAlertsHeader({ alerts, showSettings, onToggleSettings }: { alerts: BridgeAlert[]; showSettings: boolean; onToggleSettings: () => void }) {
  const criticalCount = alerts.filter(alert => alert.severity === 'crit').length;
  const warningCount = alerts.filter(alert => alert.severity === 'warn').length;
  return <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Alertas das Bridges{criticalCount > 0 && <Badge variant="destructive" className="text-[10px]">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</Badge>}{warningCount > 0 && <Badge className="text-[10px] bg-warning/20 text-warning border-warning/30">{warningCount} aviso{warningCount > 1 ? 's' : ''}</Badge>}{alerts.length === 0 && <Badge variant="secondary" className="text-[10px]">tudo ok</Badge>}</CardTitle><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => resetThresholds()}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Padrão</Button><Button variant="outline" size="sm" onClick={onToggleSettings}><Settings2 className="h-3.5 w-3.5 mr-1.5" />{showSettings ? 'Fechar' : 'Configurar'}</Button></div></CardHeader>;
}

function BridgeAlertsContent({ alerts, showSettings, thresholds }: { alerts: BridgeAlert[]; showSettings: boolean; thresholds: ReturnType<typeof getThresholds> }) {
  return <CardContent>{alerts.length === 0 ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" />Nenhum limiar excedido nas amostras atuais.</div> : <ul className="space-y-2">{alerts.map(alert => <AlertRow key={alert.key} alert={alert} />)}</ul>}{showSettings && <div className="mt-5 grid gap-4 md:grid-cols-2">{BRIDGES.map(({ id, label }) => <ThresholdEditor key={id} bridge={id} label={label} t={thresholds[id]} />)}</div>}</CardContent>;
}

export function BridgeAlertsCard() {
  const { alerts, thresholds } = useBridgeAlerts();
  const [showSettings, setShowSettings] = useState(false);
  const critCount = alerts.filter(a => a.severity === 'crit').length;
  const warnCount = alerts.filter(a => a.severity === 'warn').length;

  return (
    <Card className={getAlertCardClass(critCount, warnCount)}>
      <BridgeAlertsHeader alerts={alerts} showSettings={showSettings} onToggleSettings={() => setShowSettings(current => !current)} />
      <BridgeAlertsContent alerts={alerts} showSettings={showSettings} thresholds={thresholds} />
    </Card>
  );
}

function AlertRow({ alert }: { alert: BridgeAlert }) {
  const isCrit = alert.severity === 'crit';
  const valueStr = alert.metric === 'p95' ? formatMs(alert.value) : formatBytes(alert.value);
  const limitStr = alert.metric === 'p95' ? formatMs(alert.threshold) : formatBytes(alert.threshold);
  return (
    <li
      className={`flex items-center gap-3 p-2.5 rounded-md border ${
        isCrit
          ? 'border-destructive/40 bg-destructive/10'
          : 'border-warning/40 bg-warning/10'
      }`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${isCrit ? 'text-destructive' : 'text-warning'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          <Badge variant="outline" className="text-[10px] mr-2">{alert.bridge.replace('-db-bridge', '')}</Badge>
          <code className="font-mono text-xs">{alert.op}</code>
          {' — '}
          {alert.metric === 'p95' ? 'p95 latência' : 'tam. médio resp.'}
        </p>
        <p className="text-xs text-muted-foreground">
          atual <span className="font-mono">{valueStr}</span> · limite <span className="font-mono">{limitStr}</span> · {alert.count} amostras
        </p>
      </div>
      <Badge variant={isCrit ? 'destructive' : 'secondary'} className="text-[10px]">
        {isCrit ? 'CRÍTICO' : 'AVISO'}
      </Badge>
    </li>
  );
}

type BridgeThreshold = ReturnType<typeof getThresholds>[BridgeName];

function ThresholdNumberInput({ value, onChange, min = 0 }: { value: number; onChange: (value: number) => void; min?: number }) {
  return <Input type="number" value={value} min={min} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next) && next >= min) onChange(next); }} className="h-8 text-sm" />;
}

function ThresholdFields({ threshold, onUpdate }: { threshold: BridgeThreshold; onUpdate: (patch: Partial<BridgeThreshold>) => void }) {
  const responseWarningKb = Math.round(threshold.avgRespWarnBytes / 1024);
  const responseCriticalKb = Math.round(threshold.avgRespCritBytes / 1024);
  return <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">p95 aviso (ms)</Label><ThresholdNumberInput value={threshold.p95WarnMs} onChange={(value) => onUpdate({ p95WarnMs: value })} /></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">p95 crítico (ms)</Label><ThresholdNumberInput value={threshold.p95CritMs} onChange={(value) => onUpdate({ p95CritMs: value })} /></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">resp. aviso (KB)</Label><ThresholdNumberInput value={responseWarningKb} onChange={(value) => onUpdate({ avgRespWarnBytes: value * 1024 })} /></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">resp. crítico (KB)</Label><ThresholdNumberInput value={responseCriticalKb} onChange={(value) => onUpdate({ avgRespCritBytes: value * 1024 })} /></div><div className="space-y-1 col-span-2"><Label className="text-[11px] text-muted-foreground">amostras mínimas</Label><ThresholdNumberInput value={threshold.minSamples} onChange={(value) => onUpdate({ minSamples: Math.max(1, value) })} min={1} /></div></div>;
}

function ThresholdEditor({
  bridge, label, t,
}: { bridge: BridgeName; label: string; t: ReturnType<typeof getThresholds>[BridgeName] }) {
  const update = (patch: Partial<typeof t>) => setThresholds(bridge, patch);
  return (
    <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button variant="ghost" size="sm" onClick={() => resetThresholds(bridge)}>
          <RotateCcw className="h-3 w-3 mr-1" />reset
        </Button>
      </div>

      <ThresholdFields threshold={t} onUpdate={update} />

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <Label htmlFor={`toast-${bridge}`} className="text-xs">Notificar via toast</Label>
        <Switch
          id={`toast-${bridge}`}
          checked={t.toastEnabled}
          onCheckedChange={checked => update({ toastEnabled: checked })}
        />
      </div>
    </div>
  );
}

export default BridgeAlertsCard;
