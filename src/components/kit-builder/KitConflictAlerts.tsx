import type { ComponentType } from "react";
/**
 * Kit Conflict Alerts
 * Real-time intelligent validations beyond stock/volume:
 * - Thermal items (chocolate, food) without thermal/insulated box
 * - Weight near/over freight economy threshold
 * - Fragile items without protective packaging
 */
import { AlertTriangle, Lightbulb, Snowflake, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KitState } from "@/lib/kit-builder";

interface KitConflictAlertsProps {
  kitState: KitState;
}

interface Conflict {
  id: string;
  severity: "warning" | "danger" | "info";
  icon: ComponentType<{ className?: string }>;
  title: string;
  suggestion: string;
}

const THERMAL_KEYWORDS = ["chocolate", "bombom", "trufa", "food", "alimento", "doce", "biscoito", "café", "cafe"];
const FRAGILE_KEYWORDS = ["vidro", "porcelana", "cerâmica", "ceramica", "cristal", "garrafa"];
const ECONOMY_FREIGHT_LIMIT_G = 5000; // 5kg per kit, simplified

function matchingItems(items: KitState["items"], keywords: string[], field: "category" | "material") {
  return items.filter((item) => {
    const text = `${item.name} ${item[field] ?? ""}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
}

function thermalConflict(kitState: KitState): Conflict | null {
  if (!kitState.box) return null;
  const items = matchingItems(kitState.items, THERMAL_KEYWORDS, "category");
  if (items.length === 0) return null;
  const boxText = `${kitState.box.name} ${kitState.box.material ?? ""} ${kitState.box.boxType ?? ""}`.toLowerCase();
  if (["térmic", "termic", "isolad", "thermal", "isotérmic"].some((keyword) => boxText.includes(keyword))) return null;
  return {
    id: "thermal-mismatch",
    severity: "warning",
    icon: Snowflake,
    title: `Itens sensíveis a calor (${items.length}) em embalagem comum`,
    suggestion: "Considere uma caixa térmica ou isolada para preservar a qualidade no transporte.",
  };
}

function fragileConflict(kitState: KitState): Conflict | null {
  if (!kitState.box) return null;
  const items = matchingItems(kitState.items, FRAGILE_KEYWORDS, "material");
  if (items.length === 0) return null;
  const boxText = `${kitState.box.name} ${kitState.box.boxType ?? ""}`.toLowerCase();
  if (["rígid", "rigid", "lata", "metal", "madeira", "mdf", "kraft duplo"].some((keyword) => boxText.includes(keyword))) return null;
  return {
    id: "fragile-mismatch",
    severity: "info",
    icon: AlertTriangle,
    title: `${items.length} item(ns) frágeis detectado(s)`,
    suggestion: "Recomenda-se papel bolha ou enchimento adicional para garantir a integridade.",
  };
}

function freightConflict(totalWeight: number): Conflict | null {
  if (totalWeight <= ECONOMY_FREIGHT_LIMIT_G) return null;
  return {
    id: "freight-economy",
    severity: "warning",
    icon: Truck,
    title: `Peso por kit (${(totalWeight / 1000).toFixed(2)} kg) acima do frete econômico`,
    suggestion: "Avalie reduzir itens pesados ou considerar transportadora dedicada para grandes volumes.",
  };
}

function detectConflicts(kitState: KitState): Conflict[] {
  return [thermalConflict(kitState), fragileConflict(kitState), freightConflict(kitState.totalWeight)]
    .filter((conflict): conflict is Conflict => conflict !== null);
}

function conflictTone(severity: Conflict["severity"]) {
  if (severity === "danger") return "border-destructive/40 bg-destructive/5";
  if (severity === "warning") return "border-warning/40 bg-warning/5";
  return "border-primary/30 bg-primary/5";
}

function conflictIconTone(severity: Conflict["severity"]) {
  if (severity === "danger") return "text-destructive";
  if (severity === "warning") return "text-warning";
  return "text-primary";
}

export function KitConflictAlerts({ kitState }: KitConflictAlertsProps) {
  const conflicts = detectConflicts(kitState);
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {conflicts.map((c) => {
        const Icon = c.icon;
        const tone = conflictTone(c.severity);
        const iconTone = conflictIconTone(c.severity);
        return (
          <Card key={c.id} className={cn("border-[1.5px]", tone)}>
            <CardContent className="p-3 flex items-start gap-3">
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconTone)} />
              <div className="space-y-0.5 text-sm">
                <p className="font-medium leading-tight">{c.title}</p>
                <p className="text-muted-foreground text-xs flex items-start gap-1">
                  <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{c.suggestion}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
