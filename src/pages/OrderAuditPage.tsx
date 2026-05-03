import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  History, 
  Filter, 
  Calendar, 
  Download, 
  ExternalLink,
  UserCircle
} from 'lucide-react';
import { useOrderAudit } from '@/hooks/useOrderExtensions';
import { useOrderDetail } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function OrderAuditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    event_type: 'all',
    role: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });

  const { data: orderData } = useOrderDetail(id);
  const { auditEvents, totalCount, isLoading } = useOrderAudit(id, filters);

  return (
    <MainLayout>
      <PageSEO title={`Auditoria Pedido #${orderData?.order?.order_number || id}`} noIndex />
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Auditoria</h1>
            <p className="text-muted-foreground text-sm">
              Rastreabilidade completa do pedido #{orderData?.order?.order_number}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Ação</label>
                <Select 
                  value={filters.event_type} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    <SelectItem value="status_change">Mudança de Status</SelectItem>
                    <SelectItem value="comment">Comentário</SelectItem>
                    <SelectItem value="export">Exportação</SelectItem>
                    <SelectItem value="update">Edição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Papel</label>
                <Select 
                  value={filters.role} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    <SelectItem value="comprador_pac">PAC</SelectItem>
                    <SelectItem value="gestor_compras">Gestor</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium">Busca rápida</label>
                <Input 
                  placeholder="Buscar na descrição ou observações..." 
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground italic">Carregando eventos...</div>
          ) : auditEvents?.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
              Nenhum evento encontrado com os filtros aplicados.
            </div>
          ) : (
            auditEvents?.map((event: any) => (
              <Card key={event.id} className="overflow-hidden border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {event.event_type?.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-semibold">{event.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCircle className="h-3 w-3" /> {event.created_by_name || 'Sistema'}
                          {event.actor_role && (
                            <span className="bg-muted px-1 rounded font-mono text-[10px]">
                              {event.actor_role.toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <History className="h-3 w-3" /> 
                          {format(new Date(event.created_at || event.occurred_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {event.metadata?.file_url && (
                      <Button variant="link" size="sm" className="gap-1 h-auto p-0" asChild>
                        <a href={event.metadata.file_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" /> Arquivo Relacionado
                        </a>
                      </Button>
                    )}
                  </div>
                  {event.observations && (
                    <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded italic">
                      "{event.observations}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
