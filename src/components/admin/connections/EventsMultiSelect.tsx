/**
 * EventsMultiSelect — Onda 12 #6
 * Multi-select agrupado por categoria com busca, "todos do grupo" e suporte a eventos legacy.
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Search, X } from "lucide-react";
import {
  WEBHOOK_EVENTS_CATALOG,
  ALL_KNOWN_EVENTS,
  isLegacyEvent,
} from "@/lib/webhook-events-catalog";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

type EventGroup = (typeof WEBHOOK_EVENTS_CATALOG)[number];

function EventGroupOptions({ group, selected, onToggle, onToggleGroup }: {
  group: EventGroup;
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleGroup: (keys: string[], allOn: boolean) => void;
}) {
  const groupKeys = group.events.map((event) => event.key);
  const allOn = groupKeys.every((key) => selected.has(key));
  const someOn = groupKeys.some((key) => selected.has(key));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
          {someOn && <span className="ml-1.5 text-primary">({groupKeys.filter((key) => selected.has(key)).length}/{groupKeys.length})</span>}
        </div>
        <button type="button" onClick={() => onToggleGroup(groupKeys, allOn)} className="text-[10px] text-primary hover:underline">
          {allOn ? "Limpar" : "Selecionar todos"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {group.events.map((event) => {
          const active = selected.has(event.key);
          return (
            <button key={event.key} type="button" onClick={() => onToggle(event.key)} title={event.description}
              className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] border text-left transition-colors", active ? "bg-primary/10 border-primary/40 text-foreground" : "bg-background border-border hover:bg-muted")}>
              <span className={cn("h-3 w-3 rounded-sm border flex items-center justify-center shrink-0", active ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              <span className="flex-1 min-w-0 truncate"><span className="font-mono">{event.key}</span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LegacyEvents({ events, onRemove }: { events: string[]; onRemove: (key: string) => void }) {
  if (events.length === 0) return null;
  return <div className="space-y-1.5 pt-2 border-t"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Eventos legacy ({events.length})</div><div className="flex flex-wrap gap-1">{events.map(key => <Badge key={key} variant="outline" className="text-[10px] gap-1 bg-warning/10 border-warning/20 text-warning"><span className="font-mono">{key}</span><button type="button" onClick={() => onRemove(key)} aria-label={`Remover ${key}`} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button></Badge>)}</div><p className="text-[10px] text-muted-foreground">Eventos fora do catálogo. Mantidos para compatibilidade.</p></div>;
}

function filterEventGroups(query: string): EventGroup[] {
  return WEBHOOK_EVENTS_CATALOG.map(group => ({ ...group, events: query ? group.events.filter(event => event.key.toLowerCase().includes(query) || event.label.toLowerCase().includes(query) || event.description.toLowerCase().includes(query)) : group.events })).filter(group => group.events.length > 0);
}

function EventsSearchResults({ query, setQuery, groups, selected, onToggle, onToggleGroup }: { query: string; setQuery: (value: string) => void; groups: EventGroup[]; selected: Set<string>; onToggle: (key: string) => void; onToggleGroup: (keys: string[], allOn: boolean) => void }) {
  return <><div className="relative"><Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar evento…" className="h-8 pl-8 text-xs" /></div><div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">{groups.map(group => <EventGroupOptions key={group.category} group={group} selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />)}{groups.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Nenhum evento corresponde à busca.</div>}</div></>;
}

export function EventsMultiSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const legacy = useMemo(() => value.filter(isLegacyEvent), [value]);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const toggleGroup = (groupKeys: string[], allOn: boolean) => {
    const next = new Set(selected);
    for (const k of groupKeys) {
      if (allOn) next.delete(k);
      else next.add(k);
    }
    onChange(Array.from(next));
  };

  const removeLegacy = (key: string) => {
    onChange(value.filter((v) => v !== key));
  };

  const q = query.toLowerCase().trim();
  const groups = useMemo(() => filterEventGroups(q), [q]);

  return (
    <div className="space-y-3">
      <EventsSearchResults query={query} setQuery={setQuery} groups={groups} selected={selected} onToggle={toggle} onToggleGroup={toggleGroup} />
      <LegacyEvents events={legacy} onRemove={removeLegacy} />

      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        {selected.size} evento{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
        {" · "}{ALL_KNOWN_EVENTS.length} no catálogo SSOT.
      </div>
    </div>
  );
}
