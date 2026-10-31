import React, { useState, useEffect } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Filter, FileDown, User, Activity, Calendar, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable, type Column } from "@/components/admin/common/AdminDataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
// XLSX will be loaded dynamically when needed

// admin_audit_log.details (JSONB) guarda o payload estruturado gravado pela
// edge function admin-audit-hook: dados antigos/novos e metadados do usuário.
interface AuditLogDetails {
  old_data?: unknown;
  new_data?: { count?: number } & Record<string, unknown>;
  metadata?: { user_email?: string; user_agent?: string } & Record<string, unknown>;
}

type AuditLog = Omit<Tables<"admin_audit_log">, "details"> & {
  details: AuditLogDetails | null;
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const AUDIT_VARIANTS: Record<string, BadgeVariant> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  IMPORT: "outline",
  EXPORT: "outline",
  PUBLISH_CMS: "default",
};

export default function AdminAuditPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState({
    user: '',
    entity: '',
    type: 'ALL',
    date: undefined as Date | undefined
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.type !== 'ALL') {
        query = query.eq('action', filters.type);
      }

      if (filters.entity) {
        query = query.ilike('resource_type', `%${filters.entity}%`);
      }

      if (filters.user) {
        // user_email fica dentro de details.metadata (JSONB), usamos o operador de path
        query = query.filter('details->metadata->>user_email', 'ilike', `%${filters.user}%`);
      }

      if (filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      // Apply sorting
      if (sort) {
        query = query.order(sort.key, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setLogs((data || []) as AuditLog[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Erro ao carregar trilha de auditoria");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, currentPage, pageSize, sort]);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const XLSX = await import('@e965/xlsx');
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.type !== 'ALL') query = query.eq('action', filters.type);
      if (filters.entity) query = query.ilike('resource_type', `%${filters.entity}%`);
      if (filters.user) query = query.filter('details->metadata->>user_email', 'ilike', `%${filters.user}%`);
      
      if (filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const exportData = (data || []).map((log) => {
        const details = (log.details ?? {}) as AuditLogDetails;
        return {
          'Data': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
          'Usuário': details.metadata?.user_email || log.user_id,
          'Evento': log.action,
          'Entidade': log.resource_type,
          'ID Entidade': log.resource_id || '',
          'Antes': JSON.stringify(details.old_data || {}),
          'Depois': JSON.stringify(details.new_data || {}),
          'IP/Agente': details.metadata?.user_agent || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");
      XLSX.writeFile(workbook, `auditoria_admin_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Relatório exportado com sucesso");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erro ao exportar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      header: "Data/Hora",
      accessorKey: "created_at",
      cell: (row) => (
        <div className="text-sm">
          {format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </div>
      ),
      sortable: true
    },
    {
      header: "Usuário",
      accessorKey: "details",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.details?.metadata?.user_email?.split('@')[0] || 'Sistema'}</span>
          <span className="text-[10px] text-muted-foreground">{row.details?.metadata?.user_email || ''}</span>
        </div>
      )
    },
    {
      header: "Evento",
      accessorKey: "action",
      cell: (row) => {
        return <Badge variant={AUDIT_VARIANTS[row.action] || 'outline'}>{row.action}</Badge>;
      },
      sortable: true
    },
    {
      header: "Entidade",
      accessorKey: "resource_type",
      cell: (row) => <span className="text-sm font-mono">{row.resource_type}</span>,
      sortable: true
    },
    {
      header: "Detalhes",
      accessorKey: "id",
      cell: (row) => (
        <div className="max-w-[300px] truncate text-xs text-muted-foreground">
          {row.action === 'UPDATE' ? 'Alteração de dados' :
           row.action === 'DELETE' ? `ID: ${row.resource_id}` :
           row.action === 'IMPORT' ? `${row.details?.new_data?.count || 0} registros` : 'Ação administrativa'}
        </div>
      )
    }
  ];

  return (
    <>
      <PageSEO title="Trilha de Auditoria" description="Revise as ações administrativas do sistema." path="/admin/auditoria" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <History className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Trilha de Auditoria</h1>
              <p className="text-muted-foreground">Monitore quem, quando e o que foi alterado no painel administrativo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/auditoria/enterprise')} variant="outline" className="gap-2 border-blue-200 hover:bg-blue-50 text-blue-700">
              <ShieldCheck className="h-4 w-4" /> Dossier Enterprise
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar Relatório
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Usuário (Email)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar por email..." 
                    className="pl-9"
                    value={filters.user}
                    onChange={(e) => setFilters(f => ({ ...f, user: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Entidade</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: products, categories..." 
                    className="pl-9"
                    value={filters.entity}
                    onChange={(e) => setFilters(f => ({ ...f, entity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Evento</label>
                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="CREATE">Criação</SelectItem>
                    <SelectItem value="UPDATE">Edição</SelectItem>
                    <SelectItem value="DELETE">Exclusão</SelectItem>
                    <SelectItem value="IMPORT">Importação</SelectItem>
                    <SelectItem value="PUBLISH_CMS">Publicação CMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.date ? format(filters.date, 'dd/MM/yyyy') : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.date}
                      onSelect={(d) => setFilters(f => ({ ...f, date: d }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {Object.values(filters).some(v => v && v !== 'ALL') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 text-xs" 
                onClick={() => setFilters({ user: '', entity: '', type: 'ALL', date: undefined })}
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <AdminDataTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Busca rápida nos logs..."
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
        />
      </div>
    </>
  );
}
