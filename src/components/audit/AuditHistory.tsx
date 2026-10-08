import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, FileEdit, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { fetchAuditHistory, type AuditEntityType, type AuditLogEntry } from "@/hooks/admin/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface AuditHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  title?: string;
  maxHeight?: string;
}

const actionConfig = {
  INSERT: {
    label: "Criação",
    icon: Plus,
    variant: "default" as const,
    className: "bg-success/10 text-success border-success/20"
  },
  UPDATE: {
    label: "Edição",
    icon: FileEdit,
    variant: "secondary" as const,
    className: "bg-info/10 text-info border-info/20"
  },
  DELETE: {
    label: "Exclusão",
    icon: Trash2,
    variant: "destructive" as const,
    className: "bg-destructive/10 text-destructive border-destructive/20"
  }
};

const fieldLabels: Record<string, string> = {
  name: "Nome",
  description: "Descrição",
  price: "Preço",
  cost_price: "Preço de Custo",
  min_quantity: "Qtd. Mínima",
  is_active: "Ativo",
  featured: "Destaque",
  stock: "Estoque",
  sku: "SKU",
  category_name: "Categoria",
  supplier_id: "Fornecedor",
  colors: "Cores",
  materials: "Materiais",
  images: "Imagens",
  status: "Status",
  total: "Total",
  discount_percent: "Desconto (%)",
  notes: "Observações"
};

function formatNumberField(value: number): string {
  if (value > 0 && value < 1000000) {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  return value.toString();
}

function formatArrayField(value: unknown[]): string {
  if (value.length === 0) return "—";
  if (value.length > 3) return `${value.slice(0, 3).join(", ")} +${value.length - 3}`;
  return value.join(", ");
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return formatNumberField(value);
  if (Array.isArray(value)) return formatArrayField(value);
  if (typeof value === "object") {
    return JSON.stringify(value).substring(0, 50) + "...";
  }
  return String(value);
}

function asFieldRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function FieldChange({ field, oldValue, newValue }: { field: string; oldValue: unknown; newValue: unknown }) {
  const label = fieldLabels[field] || field;
  
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm py-1">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="text-destructive line-through">{formatFieldValue(oldValue)}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-success font-medium">{formatFieldValue(newValue)}</span>
    </div>
  );
}

function AuditActor({ log }: { log: AuditLogEntry }) {
  return (
    <span className="text-sm font-medium flex items-center gap-1">
      <User className="h-3 w-3" />
      {log.profiles?.full_name || log.profiles?.email || "Sistema"}
    </span>
  );
}

function AuditDetailsTrigger({ expanded }: { expanded: boolean }) {
  return (
    <CollapsibleTrigger asChild>
      <button className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline" aria-label="Avançar">
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? "Ocultar detalhes" : "Ver campos alterados"}
      </button>
    </CollapsibleTrigger>
  );
}

function AuditActionSummary({ log, fieldCount }: { log: AuditLogEntry; fieldCount: number }) {
  if (log.action === "INSERT" && log.new_values) {
    return <div className="mt-2 text-xs text-muted-foreground">Registro criado com {fieldCount} campos</div>;
  }
  if (log.action === "DELETE") {
    return <div className="mt-2 text-xs text-destructive">Registro excluído permanentemente</div>;
  }
  return null;
}

function AuditFieldChanges({ oldValues, newValues }: { oldValues: Record<string, unknown>; newValues: Record<string, unknown> }) {
  return (
    <div className="mt-3 ml-13 pl-4 border-l-2 border-muted">
      {Object.keys(newValues).map((field) => (
        <FieldChange key={field} field={field} oldValue={oldValues[field]} newValue={newValues[field]} />
      ))}
    </div>
  );
}

function AuditLogRow({ log, expanded, onToggle }: { log: AuditLogEntry; expanded: boolean; onToggle: () => void }) {
  const config = actionConfig[log.action as keyof typeof actionConfig] || actionConfig.UPDATE;
  const Icon = config.icon;
  const oldValues = asFieldRecord(log.old_values);
  const newValues = asFieldRecord(log.new_values);
  const hasDetails = log.action === "UPDATE" && Object.keys(newValues).length > 0;

  return (
    <Collapsible open={expanded} onOpenChange={() => { if (hasDetails) onToggle(); }}>
      <div className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className={cn("flex items-center justify-center h-10 w-10 rounded-full border", config.className)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={config.className}>{config.label}</Badge>
              <span className="text-sm text-muted-foreground">por</span>
              <AuditActor log={log} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(log.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {hasDetails && <AuditDetailsTrigger expanded={expanded} />}
            <AuditActionSummary log={log} fieldCount={Object.keys(newValues).length} />
          </div>
        </div>
        <CollapsibleContent>
          {hasDetails && <AuditFieldChanges oldValues={oldValues} newValues={newValues} />}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AuditHistory({ 
  entityType, 
  entityId, 
  title = "Histórico de Alterações",
  maxHeight = "400px"
}: AuditHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: history, isLoading } = useQuery({
    queryKey: ['audit-history', entityType, entityId],
    queryFn: () => fetchAuditHistory(entityType, entityId),
    enabled: !!entityId
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum registro de alteração encontrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
          <Badge variant="outline" className="ml-2">
            {history.length} {history.length === 1 ? "registro" : "registros"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="divide-y">
            {history.map((log) => (
              <AuditLogRow key={log.id} log={log} expanded={expandedItems.has(log.id)} onToggle={() => toggleExpanded(log.id)} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
