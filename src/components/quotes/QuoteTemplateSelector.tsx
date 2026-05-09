import React from "react";
import { useQuoteTemplates, type QuoteTemplate } from "@/hooks/useQuoteTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookTemplate, Trash2, Plus, Copy, Globe, Lock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface QuoteTemplateSelectorProps {
  onSelect: (template: QuoteTemplate) => void;
  className?: string;
}

export function QuoteTemplateSelector({ onSelect, className }: QuoteTemplateSelectorProps) {
  const { templates, isLoading, deleteTemplate } = useQuoteTemplates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <BookTemplate className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold">Nenhum template encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            Crie templates para agilizar a montagem de orçamentos recorrentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelect(template)}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-sm font-bold truncate">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                    {template.description || "Sem descrição"}
                  </CardDescription>
                </div>
                <Badge variant={template.is_public ? "default" : "secondary"} className="shrink-0 h-5 px-1.5 text-[10px]">
                  {template.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                  {template.is_public ? "Público" : "Privado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5 bg-primary/5">
                  {(template.items_data as any[])?.length || 0} itens
                </Badge>
                {template.discount_percent && (
                  <Badge variant="outline" className="text-[10px] h-5 text-green-600 bg-green-50 border-green-200">
                    -{template.discount_percent}%
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTemplate(template.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
