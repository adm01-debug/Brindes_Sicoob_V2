
import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Image, Settings, Globe, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/common/AdminDataTable";
import { logAdminAction } from "@/utils/adminAudit";
import * as XLSX from 'xlsx';

export default function AdminCMSPage() {
  return (
    <MainLayout>
      <PageSEO title="Gestão de Conteúdo (CMS)" description="Administre banners, seções e SEO do site." path="/admin/cms" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Layout className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">CMS - Gestão de Conteúdo</h1>
            <p className="text-muted-foreground">Personalize a interface, banners e configurações de SEO</p>
          </div>
        </div>

        <Tabs defaultValue="banners" className="space-y-4">
          <TabsList>
            <TabsTrigger value="banners" className="gap-2"><Image className="h-4 w-4" /> Banners</TabsTrigger>
            <TabsTrigger value="sections" className="gap-2"><Layout className="h-4 w-4" /> Seções</TabsTrigger>
            <TabsTrigger value="seo" className="gap-2"><Globe className="h-4 w-4" /> SEO</TabsTrigger>
            <TabsTrigger value="visual" className="gap-2"><Settings className="h-4 w-4" /> Visual</TabsTrigger>
          </TabsList>

          <TabsContent value="banners">
            <BannersTab />
          </TabsContent>

          <TabsContent value="sections">
            <SectionsTab />
          </TabsContent>

          <TabsContent value="seo">
            <SeoTab />
          </TabsContent>

          <TabsContent value="visual">
            <VisualTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleExport = (data: any[]) => {
    const exportData = data.map(b => ({
      'Título': b.title,
      'URL Imagem': b.image_url,
      'Link': b.link_url || '',
      'Posição': b.position,
      'Ordem': b.sort_order,
      'Status': b.is_active ? 'Ativo' : 'Inativo'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Banners");
    XLSX.writeFile(workbook, `banners_cms_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchBanners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('cms_banners').select('*').order('sort_order', { ascending: true });
    if (error) {
      toast.error("Erro ao carregar banners");
    } else {
      setBanners(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir banner "${title}"?`)) return;
    const { error } = await supabase.from('cms_banners').delete().eq('id', id);
    if (!error) {
      toast.success("Banner excluído");
      logAdminAction({
        event_type: 'DELETE',
        entity_type: 'cms_banners',
        entity_id: id,
        metadata: { title }
      });
      fetchBanners();
    } else {
      toast.error("Erro ao excluir banner");
    }
  };

  const columns = [
    {
      header: "Imagem",
      accessorKey: "image_url",
      cell: (row: any) => <img src={row.image_url} className="w-16 h-8 object-cover rounded border" alt={row.title} />
    },
    {
      header: "Título",
      accessorKey: "title",
      sortable: true
    },
    {
      header: "Posição",
      accessorKey: "position",
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
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(row.id, row.title)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Banners Rotativos</CardTitle><CardDescription>Gerencie as imagens e links do carrossel principal</CardDescription></div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Banner</Button>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={banners}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Buscar banners..."
          searchKey="title"
          onExport={handleExport}
        />
      </CardContent>
    </Card>
  );
}

function SectionsTab() {
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSections = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('cms_sections').select('*').order('sort_order', { ascending: true });
    setSections(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const columns = [
    { header: "Nome", accessorKey: "name", sortable: true },
    { header: "Tipo", accessorKey: "type", cell: (row: any) => <Badge variant="outline">{row.type}</Badge> },
    { header: "Ordem", accessorKey: "sort_order", sortable: true },
    { 
      header: "Status", 
      accessorKey: "is_active",
      cell: (row: any) => <Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? "Ativa" : "Inativa"}</Badge>
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (row: any) => <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Seções de Conteúdo</CardTitle><CardDescription>Configure seções personalizadas na home e páginas</CardDescription></div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Seção</Button>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={sections}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Buscar seções..."
          searchKey="name"
        />
      </CardContent>
    </Card>
  );
}

function SeoTab() {
  const handleSaveSeo = async () => {
    toast.success("Configurações de SEO salvas!");
    logAdminAction({
      event_type: 'PUBLISH_CMS',
      entity_type: 'cms_seo_config',
      metadata: { action: 'update_global_seo' }
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>SEO Meta Tags</CardTitle><CardDescription>Configure as tags de SEO globais do sistema</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2"><label className="text-sm font-medium">Título Global</label><Input defaultValue="Sicoob Brindes" /></div>
        <div className="grid gap-2"><label className="text-sm font-medium">Keywords</label><Input defaultValue="brindes, cooperativismo, sicoob" /></div>
        <Button onClick={handleSaveSeo}>Salvar Configurações</Button>
      </CardContent>
    </Card>
  );
}

function VisualTab() {
  return (
    <Card>
      <CardHeader><CardTitle>Identidade Visual</CardTitle><CardDescription>Ajuste as cores e logotipos principais</CardDescription></CardHeader>
      <CardContent className="text-center py-12 text-muted-foreground">Configurações de tema integradas ao ThemeContext</CardContent>
    </Card>
  );
}
