import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Filter } from 'lucide-react';
import { useOrderAudit } from '@/hooks/useOrderExtensions';
import { useOrderDetail } from '@/hooks/useOrders';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AuditEventCard } from '@/components/audit/AuditEventCard';

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
  const { auditEvents, isLoading } = useOrderAudit(id, filters);

  return (
    <>
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
              <AuditEventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
