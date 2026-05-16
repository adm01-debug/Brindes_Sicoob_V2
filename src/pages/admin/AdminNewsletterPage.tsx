import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Mail, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDataTable } from "@/components/admin/common/AdminDataTable";
import { ImportExportManager } from "@/components/admin/common/ImportExportManager";
import * as XLSX from '@e965/xlsx';
import { logAdminAction } from "@/utils/adminAudit";

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Erro ao carregar assinantes da newsletter");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o assinante ${email}?`)) return;
    try {
      const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
      if (error) throw error;
      
      await logAdminAction({
        event_type: 'DELETE',
        entity_type: 'newsletter_subscribers',
        entity_id: id,
        metadata: { email }
      });

      toast.success("Assinante excluído com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      toast.error("Erro ao excluir assinante");
    }
  };

  const handleImport = async (data: any[]) => {
    const records = data.map(item => ({
      email: item.Email || item.email,
      full_name: item['Nome Completo'] || item.full_name || item.name,
      source: item.Origem || item.source || 'Importação Manual',
      is_active: true
    }));

    const { error } = await supabase.from('newsletter_subscribers').upsert(records, { 
      onConflict: 'email',
      ignoreDuplicates: false 
    });

    if (error) throw error;

    await logAdminAction({
      event_type: 'IMPORT',
      entity_type: 'newsletter_subscribers',
      payload: { count: records.length }
    });

    fetchData();
  };

  const handleExport = () => {
    const exportData = subscribers.map(s => ({
      'Email': s.email,
      'Nome Completo': s.full_name || '',
      'Data de Inscrição': new Date(s.created_at).toLocaleDateString('pt-BR'),
      'Origem': s.source || 'Geral',
      'Status': s.is_active ? 'Ativo' : 'Inativo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assinantes");
    XLSX.writeFile(workbook, `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.xlsx`);

    logAdminAction({
      event_type: 'EXPORT',
      entity_type: 'newsletter_subscribers',
      metadata: { count: exportData.length }
    });
  };

  const columns = [
    { 
      header: "Email", 
      accessorKey: "email",
      sortable: true
    },
    { 
      header: "Nome Completo", 
      accessorKey: "full_name",
      sortable: true
    },
    { 
      header: "Data de Inscrição", 
      accessorKey: "created_at",
      cell: (row: any) => new Date(row.created_at).toLocaleDateString('pt-BR'),
      sortable: true
    },
    { 
      header: "Origem", 
      accessorKey: "source",
      sortable: true
    },
    { 
      header: "Status", 
      accessorKey: "is_active",
      cell: (row: any) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Ativo" : "Inativo"}
        </Badge>
      ),
      sortable: true
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (row: any) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={() => handleDelete(row.id, row.email)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <PageSEO title="Assinantes Newsletter" description="Gerencie a lista de assinantes da newsletter." path="/admin/newsletter" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Newsletter</h1>
              <p className="text-muted-foreground">Gerencie a lista de e-mails para envio de novidades e campanhas</p>
            </div>
          </div>
          <ImportExportManager
            entityName="Assinantes"
            onImport={handleImport}
            onExport={handleExport}
            expectedColumns={[
              { key: 'email', label: 'Email', required: true, type: 'email' },
              { key: 'full_name', label: 'Nome Completo', required: false },
              { key: 'source', label: 'Origem', required: false }
            ]}
            templateData={[
              { Email: 'exemplo@sicoob.com.br', 'Nome Completo': 'João Silva', Origem: 'Site Principal' }
            ]}
          />
        </div>

        <AdminDataTable
          data={subscribers}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Buscar por email ou nome..."
          searchKey="email"
        />
      </div>
    </>
  );
}

