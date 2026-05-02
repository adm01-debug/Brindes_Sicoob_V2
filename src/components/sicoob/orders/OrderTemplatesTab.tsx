import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout, FileText, CheckCircle } from "lucide-react";
import { useOrderTemplates } from "@/hooks/useOrderExtensions";
import { Badge } from "@/components/ui/badge";

interface OrderTemplatesTabProps {
  orderId: string;
}

export function OrderTemplatesTab({ orderId }: OrderTemplatesTabProps) {
  const { templates, isLoading } = useOrderTemplates(orderId);

  if (isLoading) return <div className="p-8 text-center">Carregando templates...</div>;

  return (
    <div className="space-y-6">
      {templates?.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
          Nenhum template disponível para este pedido.
        </div>
      ) : (
        templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  {template.name}
                </CardTitle>
                <Badge variant="outline">Template #{template.id.slice(0, 8)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {template.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="h-8 w-8 bg-background rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{item.type}</p>
                      </div>
                      {item.is_required && <Badge variant="secondary" className="text-[8px] h-4">Obrigatório</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
