import { useState } from "react";
import { BookTemplate, Plus, Loader2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  onApplyTemplate: (items: any[]) => void;
}

/**
 * OrderTemplatesSheet — Permite gerenciar e aplicar templates de pedidos.
 */
export function OrderTemplatesSheet({ onApplyTemplate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["order-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_templates")
        .select("*, items:order_template_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template removido");
      qc.invalidateQueries({ queryKey: ["order-templates"] });
    },
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookTemplate className="h-4 w-4" />
          Templates de Pedido
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[450px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Meus Templates
          </SheetTitle>
          <SheetDescription>
            Use modelos salvos para criar novos pedidos rapidamente.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-20">
              <BookTemplate className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Nenhum template salvo ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="group overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{tpl.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tpl.items?.length || 0} item(ns) • Criado em {format(new Date(tpl.created_at), "dd/MM/yy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTemplate.mutate(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4 h-8 text-xs gap-2"
                      onClick={() => {
                        onApplyTemplate(tpl.items || []);
                        setIsOpen(false);
                        toast.success(`Template "${tpl.name}" aplicado!`);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aplicar Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
