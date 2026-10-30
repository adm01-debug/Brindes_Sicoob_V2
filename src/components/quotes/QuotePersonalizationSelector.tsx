import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type PersonalizationTechnique } from "@/hooks/quotes/quoteTypes";

interface QuotePersonalizationSelectorProps {
  techniques: PersonalizationTechnique[];
  selectedId?: string;
  onSelect: (technique: PersonalizationTechnique) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Seletor de técnicas de personalização para itens do orçamento.
 */
export function QuotePersonalizationSelector({
  techniques,
  selectedId,
  onSelect,
  label = "Técnica de Personalização",
  disabled = false,
}: QuotePersonalizationSelectorProps) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium text-muted-foreground">{label}</Label>}
      <Select
        value={selectedId}
        onValueChange={(id) => {
          const tech = techniques.find(t => t.id === id);
          if (tech) onSelect(tech);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Selecione uma técnica..." />
        </SelectTrigger>
        <SelectContent>
          {techniques.filter((tech): tech is PersonalizationTechnique & { id: string } => Boolean(tech.id)).map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              <div className="flex flex-col">
                <span className="font-medium">{tech.name}</span>
                {tech.description && (
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {tech.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
