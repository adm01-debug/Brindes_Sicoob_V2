import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Image, Settings, Globe, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
            <Card><CardHeader><CardTitle>SEO Meta Tags</CardTitle><CardDescription>Configure as tags de SEO globais do sistema</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-2"><label className="text-sm font-medium">Título Global</label><Input defaultValue="Sicoob Brindes" /></div><div className="grid gap-2"><label className="text-sm font-medium">Keywords</label><Input defaultValue="brindes, cooperativismo, sicoob" /></div><Button>Salvar Configurações</Button></CardContent></Card>
          </TabsContent>

          <TabsContent value="visual">
            <Card><CardHeader><CardTitle>Identidade Visual</CardTitle><CardDescription>Ajuste as cores e logotipos principais</CardDescription></CardHeader><CardContent className="text-center py-12 text-muted-foreground">Configurações de tema integradas ao ThemeContext</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const filteredBanners = useMemo(() => {
    return banners.filter(b => 
      b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [banners, searchTerm]);

  const totalPages = Math.ceil(filteredBanners.length / pageSize);
  const paginatedBanners = filteredBanners.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Banners Rotativos</CardTitle><CardDescription>Gerencie as imagens e links do carrossel principal</CardDescription></div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Banner</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar banners..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="pl-9" 
          />
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Imagem</TableHead><TableHead>Título</TableHead><TableHead>Posição</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow> :
             paginatedBanners.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum banner encontrado</TableCell></TableRow> :
             paginatedBanners.map(b => (
               <TableRow key={b.id}>
                 <TableCell><img src={b.image_url} className="w-16 h-8 object-cover rounded border" /></TableCell>
                 <TableCell className="font-medium">{b.title}</TableCell>
                 <TableCell>{b.position}</TableCell>
                 <TableCell><Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                 <TableCell className="text-right">
                   <div className="flex justify-end gap-2">
                     <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                     <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                   </div>
                 </TableCell>
               </TableRow>
             ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Seções de Conteúdo</CardTitle><CardDescription>Configure seções personalizadas na home e páginas</CardDescription></div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Seção</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Ordem</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow> :
             sections.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma seção cadastrada</TableCell></TableRow> :
             sections.map(s => (
               <TableRow key={s.id}>
                 <TableCell className="font-medium">{s.name}</TableCell>
                 <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                 <TableCell>{s.sort_order}</TableCell>
                 <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                 <TableCell className="text-right"><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></TableCell>
               </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
