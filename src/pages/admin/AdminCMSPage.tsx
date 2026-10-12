

import React, { useState, useEffect } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Image, Settings, Globe, Plus, Pencil, Trash2, Palette, Eye, Type, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/admin/common/AdminDataTable";
import { logAdminAction } from "@/utils/adminAudit";
import type { Tables } from "@/integrations/supabase/types";
import { askConfirm } from '@/stores/useConfirmDialogStore';
// XLSX will be loaded dynamically when needed

export default function AdminCMSPage() {
  return (
    <>
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
    </>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<Tables<"cms_banners">[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleExport = async (data: Tables<"cms_banners">[]) => {
    try {
      const XLSX = await import('@e965/xlsx');
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
      toast.success("Banners exportados com sucesso");
    } catch (error) {
      console.error("Error exporting banners:", error);
      toast.error("Erro ao carregar módulo de exportação");
    }
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
    if (!(await askConfirm({ title: 'Excluir banner?', description: `Você está prestes a excluir "${title}". Esta ação não pode ser desfeita.`, variant: 'destructive', confirmLabel: 'Excluir' }))) return;
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

  const columns: Column<Tables<"cms_banners">>[] = [
    {
      header: "Imagem",
      accessorKey: "image_url",
      cell: (row) => <img src={row.image_url} className="w-16 h-8 object-cover rounded border" alt={row.title} />
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
      cell: (row) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Ativo" : "Inativo"}
        </Badge>
      ),
      sortable: true
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (row) => (
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
  const [sections, setSections] = useState<Tables<"cms_sections">[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSections = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('cms_sections').select('*').order('sort_order', { ascending: true });
    setSections(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const columns: Column<Tables<"cms_sections">>[] = [
    { header: "Nome", accessorKey: "name", sortable: true },
    { header: "Tipo", accessorKey: "type", cell: (row) => <Badge variant="outline">{row.type}</Badge> },
    { header: "Ordem", accessorKey: "sort_order", sortable: true },
    { 
      header: "Status", 
      accessorKey: "is_active",
      cell: (row) => <Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? "Ativa" : "Inativa"}</Badge>
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: () => <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
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
  const [seoConfig, setSeoConfig] = useState({
    site_title: 'Promo Gifts | Sicoob',
    site_description: 'Plataforma oficial de brindes e materiais promocionais Sicoob.',
    keywords: 'brindes, sicoob, promocional, cooperativismo',
    og_image: '',
    google_analytics_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSeo = async () => {
      const { data } = await supabase.from('cms_config').select('*').eq('key', 'seo_global').single();
      if (data?.value) setSeoConfig(data.value as unknown as typeof seoConfig);
    };
    fetchSeo();
  }, []);

  const handleSaveSeo = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cms_config')
        .upsert({ key: 'seo_global', value: seoConfig }, { onConflict: 'key' });
      
      if (error) throw error;

      toast.success("Configurações de SEO salvas!");
      await logAdminAction({
        event_type: 'PUBLISH_CMS',
        entity_type: 'cms_config',
        metadata: { action: 'update_global_seo', config: seoConfig }
      });
    } catch {
      toast.error("Erro ao salvar SEO");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> SEO Meta Tags</CardTitle>
          <CardDescription>Configure como o sistema aparece nos buscadores e redes sociais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="site_title">Título do Site (Meta Title)</Label>
            <Input 
              id="site_title" 
              value={seoConfig.site_title} 
              onChange={e => setSeoConfig({...seoConfig, site_title: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="site_desc">Descrição (Meta Description)</Label>
            <Textarea 
              id="site_desc" 
              value={seoConfig.site_description} 
              onChange={e => setSeoConfig({...seoConfig, site_description: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
            <Input 
              id="keywords" 
              value={seoConfig.keywords} 
              onChange={e => setSeoConfig({...seoConfig, keywords: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="og_image">URL da Imagem Social (Open Graph)</Label>
            <Input 
              id="og_image" 
              placeholder="https://..." 
              value={seoConfig.og_image} 
              onChange={e => setSeoConfig({...seoConfig, og_image: e.target.value})} 
            />
          </div>
          <Button onClick={handleSaveSeo} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Eye className="h-4 w-4" /> Pré-visualização Google</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-white rounded border shadow-sm space-y-1 max-w-[500px]">
            <p className="text-[#1a0dab] text-xl hover:underline cursor-pointer truncate">{seoConfig.site_title}</p>
            <p className="text-[#006621] text-sm truncate">{window.location.origin}</p>
            <p className="text-[#4d5156] text-sm line-clamp-2">{seoConfig.site_description}</p>
          </div>
          <div className="mt-6 p-4 bg-white rounded border shadow-sm space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Redes Sociais</p>
            <div className="aspect-video bg-muted rounded flex items-center justify-center overflow-hidden border">
              {seoConfig.og_image ? <img src={seoConfig.og_image} className="w-full h-full object-cover" alt="Preview" /> : <Globe className="h-12 w-12 opacity-10" />}
            </div>
            <p className="font-bold text-lg">{seoConfig.site_title}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">{seoConfig.site_description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VisualTab() {
  const [theme, setTheme] = useState({
    primary_color: '#003641',
    accent_color: '#7fbb00',
    border_radius: '0.5rem',
    font_family: 'Outfit'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchVisual = async () => {
      const { data } = await supabase.from('cms_config').select('*').eq('key', 'visual_identity').single();
      if (data?.value) setTheme(data.value as unknown as typeof theme);
    };
    fetchVisual();
  }, []);

  const handleSaveVisual = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cms_config')
        .upsert({ key: 'visual_identity', value: theme }, { onConflict: 'key' });
      
      if (error) throw error;
      toast.success("Identidade visual salva! Recarregue para aplicar.");
    } catch {
      toast.error("Erro ao salvar visual");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Estilo & Cores</CardTitle>
          <CardDescription>Personalize as cores principais e tipografia do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária (Sicoob)</Label>
              <div className="flex gap-2">
                <Input type="color" value={theme.primary_color} onChange={e => setTheme({...theme, primary_color: e.target.value})} className="w-12 h-10 p-1" />
                <Input value={theme.primary_color} onChange={e => setTheme({...theme, primary_color: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input type="color" value={theme.accent_color} onChange={e => setTheme({...theme, accent_color: e.target.value})} className="w-12 h-10 p-1" />
                <Input value={theme.accent_color} onChange={e => setTheme({...theme, accent_color: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arredondamento (Border Radius)</Label>
            <Select value={theme.border_radius} onValueChange={v => setTheme({...theme, border_radius: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0rem">Quadrado (0)</SelectItem>
                <SelectItem value="0.25rem">Sutil (4px)</SelectItem>
                <SelectItem value="0.5rem">Padrão (8px)</SelectItem>
                <SelectItem value="1rem">Arredondado (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Type className="h-4 w-4" /> Fonte Principal</Label>
            <Select value={theme.font_family} onValueChange={v => setTheme({...theme, font_family: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Outfit">Outfit (Padrão)</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveVisual} disabled={isSaving} className="w-full">
            {isSaving ? "Salvando..." : "Salvar Identidade Visual"}
          </Button>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pré-visualização de Interface</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20 rounded-b-xl border-t">
          <div 
            className="w-full max-w-sm p-6 bg-background shadow-xl space-y-4"
            style={{ borderRadius: theme.border_radius, fontFamily: theme.font_family }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: theme.primary_color }} />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-2 w-16 bg-muted/50 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
            <Button 
              className="w-full text-white" 
              style={{ backgroundColor: theme.accent_color, borderRadius: theme.border_radius }}
            >
              Botão de Ação
            </Button>
            <div className="flex justify-between pt-4 border-t">
              <div className="h-2 w-12 bg-muted rounded" />
              <div className="h-2 w-12 bg-muted rounded" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 italic">Esta é uma simulação de como os tokens serão aplicados.</p>
        </CardContent>
      </Card>
    </div>
  );
}
