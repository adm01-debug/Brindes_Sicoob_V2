import React from "react";
import { useQuoteTemplates, type QuoteTemplate } from "@/hooks/useQuoteTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookTemplate, Plus, Edit2, Trash2, Globe, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface QuoteTemplatesListProps {
  onCreateTemplate: () => void;
  onEditTemplate: (template: QuoteTemplate) => void;
}

export function QuoteTemplatesList({ onCreateTemplate, onEditTemplate }: QuoteTemplatesListProps) {
  const { templates, isLoading, deleteTemplate } = useQuoteTemplates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={onCreateTemplate} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookTemplate className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum template criado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Você ainda não criou nenhum modelo de orçamento. Comece criando um para agilizar seu trabalho.
            </p>
            <Button variant="outline" onClick={onCreateTemplate} className="mt-6 rounded-xl">
              Criar meu primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden group hover:border-primary/40 transition-all duration-300 rounded-2xl">
              <CardContent className="p-0">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{template.name}</h3>
                        <Badge variant={template.is_public ? "default" : "secondary"} className="h-5 px-1.5 text-[9px] uppercase tracking-wider">
                          {template.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                          {template.is_public ? "Público" : "Privado"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                        {template.description || "Nenhuma descrição informada."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] h-6 bg-primary/5">
                      {(template.items_data as any[])?.length || 0} Itens
                    </Badge>
                    {template.discount_percent && (
                      <Badge variant="outline" className="text-[11px] h-6 text-green-600 bg-green-50 border-green-200">
                        -{template.discount_percent}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-muted/30 flex items-center justify-between border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Ações</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-primary"
                      onClick={() => onEditTemplate(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
