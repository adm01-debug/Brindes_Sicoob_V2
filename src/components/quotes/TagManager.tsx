import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  readonly?: boolean;
}

export function TagManager({ tags = [], onChange, className, readonly = false }: TagManagerProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && readonly && (
          <span className="text-xs text-muted-foreground italic">Sem etiquetas</span>
        )}
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-muted/50 hover:bg-muted/80 transition-colors"
          >
            <TagIcon className="h-2.5 w-2.5 opacity-60" />
            {tag}
            {!readonly && (
              <button
                type="button"
                aria-label={`Remover etiqueta ${tag}`}
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {!readonly && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <TagIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              aria-label="Adicionar etiqueta"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adicionar etiqueta..."
              className="h-7 text-xs pl-7 pr-2"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            className="h-7 px-2 text-[10px] gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
