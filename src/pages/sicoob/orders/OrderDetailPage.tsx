import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MapPin, 
  Package, 
  History,
  MessageSquare
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageSEO title={`Pedido #${id} - Sicoob`} description="Detalhes do pedido Sicoob." path={`/sicoob/pedidos/${id}`} noIndex />
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sicoob/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Pedido #{id}</h1>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                Aguardando Aprovação
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Criado em 02 de Maio de 2026 às 14:45</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="text-destructive">Rejeitar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Aprovar Pedido</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Produto Sicoob Exemplo {i}</p>
                          <p className="text-xs text-muted-foreground">SKU: SIC-00{i}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ 150,00</p>
                        <p className="text-xs text-muted-foreground">Qtd: 2</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-4 border-t-2 border-dashed">
                    <span className="font-bold">Total do Pedido</span>
                    <span className="text-xl font-bold text-primary">R$ 900,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="history">
              <TabsList>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          <div className="w-0.5 h-full bg-border" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Enviado para Aprovação</p>
                          <p className="text-xs text-muted-foreground">Por João Vendedor em 02/05/2026 às 14:50</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-muted mt-1.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-muted-foreground">Pedido Criado (Rascunho)</p>
                          <p className="text-xs text-muted-foreground">Por João Vendedor em 02/05/2026 às 14:45</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="comments">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Informações de Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-bold">PA Centro (0012)</p>
                    <p className="text-muted-foreground">Rua das Cooperativas, 123, Centro - Brasília/DF</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-bold">Responsável</p>
                    <p className="text-muted-foreground">Maria Gerente (PA Centro)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Status do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo em espera
                  </span>
                  <span className="font-bold">02:15:00</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">
                    Este pedido está dentro do limite de alçada do PA (R$ 5.000,00).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
