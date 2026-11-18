import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderTree, Pencil, Trash2, BarChart3, Plus, Loader2, Network, List as ListIcon } from "lucide-react";
import { DialogDescription, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/common/AdminDataTable";
import { ImportExportManager } from "@/components/admin/common/ImportExportManager";
import { CategoryTreeDiagram } from "./CategoryTreeDiagram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from '@e965/xlsx';
import { logAdminAction } from "@/utils/adminAudit";
import { useAdminPermissions } from "@/hooks/admin/useAdminPermissions";
import { getErrorMessage } from "@/components/admin/utils/errors";
import type { Json } from "@/integrations/supabase/types";
import { askConfirm } from '@/stores/useConfirmDialogStore';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string | null;
}

function categoryAuditState(category: Category): Json {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parent_id: category.parent_id,
    sort_order: category.sort_order,
    is_active: category.is_active,
    created_at: category.created_at,
  };
}

function importValue(item: Record<string, unknown>, keys: string[], fallback = ''): unknown {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined) return value;
  }
  return fallback;
}

function mapImportedCategory(item: Record<string, unknown>) {
  const name = String(importValue(item, ['Nome', 'name']));
  return {
    name,
    slug: String(importValue(item, ['Slug', 'slug'], name)).toLowerCase().replace(/\s+/g, '-'),
    description: String(importValue(item, ['Descrição', 'description'])),
    sort_order: Number.parseInt(String(importValue(item, ['Ordem', 'sort_order'], '0')), 10),
    is_active: true,
  };
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { canEdit, canDelete } = useAdminPermissions();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async (formData: CategoryFormData) => {
    setIsLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update(formData)
          .eq('id', editingCategory.id);
        if (error) throw error;

        await logAdminAction({
          event_type: 'UPDATE',
          entity_type: 'product_categories',
          entity_id: editingCategory.id,
          payload: categoryFormAuditState(formData),
          previous_state: categoryAuditState(editingCategory)
        });

        toast.success("Categoria atualizada com sucesso");
      } else {
        const { data, error } = await supabase
          .from('product_categories')
          .insert(formData)
          .select()
          .single();
        if (error) throw error;

        await logAdminAction({
          event_type: 'CREATE',
          entity_type: 'product_categories',
          entity_id: data.id,
          payload: categoryFormAuditState(formData)
        });

        toast.success("Categoria criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: unknown) {
      console.error("Error saving category:", error);
      toast.error(getErrorMessage(error, "Erro ao salvar categoria"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await askConfirm({ title: 'Excluir categoria?', description: `Você está prestes a excluir "${name}". Esta ação não pode ser desfeita.`, variant: 'destructive', confirmLabel: 'Excluir' }))) return;
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await logAdminAction({
        event_type: 'DELETE',
        entity_type: 'product_categories',
        entity_id: id,
        metadata: { name }
      });

      toast.success("Categoria excluída com sucesso");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria");
    }
  };

  const handleImport = async (data: Array<Record<string, unknown>>) => {
    const records = data.map(mapImportedCategory);

    const { error } = await supabase.from('product_categories').upsert(records, { onConflict: 'slug' });
    if (error) throw error;

    await logAdminAction({
      event_type: 'IMPORT',
      entity_type: 'product_categories',
      payload: { count: records.length }
    });

    fetchCategories();
  };

  const handleExport = () => {
    const exportData = categories.map(c => ({
      'Nome': c.name,
      'Slug': c.slug,
      'Descrição': c.description || '',
      'Ordem': c.sort_order,
      'Status': c.is_active ? 'Ativa' : 'Inativa'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categorias");
    XLSX.writeFile(workbook, `categorias_${new Date().toISOString().split('T')[0]}.xlsx`);

    logAdminAction({
      event_type: 'EXPORT',
      entity_type: 'product_categories',
      metadata: { count: exportData.length }
    });
  };

  const columns = [
    { 
      header: "Nome", 
      accessorKey: "name",
      cell: (row: Category) => (
        <div className="flex items-center gap-2">
          {row.parent_id && <Badge variant="outline" className="text-[10px] uppercase">Sub</Badge>}
          <span className="font-medium">{row.name}</span>
        </div>
      ),
      sortable: true
    },
    { header: "Slug", accessorKey: "slug", sortable: true },
    { header: "Ordem", accessorKey: "sort_order", sortable: true },
    { 
      header: "Status", 
      accessorKey: "is_active",
      cell: (row: Category) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Ativa" : "Inativa"}
        </Badge>
      ),
      sortable: true
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (row: Category) => (
        <div className="flex justify-end gap-2">
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(row); setIsFormOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(row.id, row.name)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FolderTree className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Categorias</p>
              <h3 className="text-2xl font-bold">{categories.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/20">Ativas</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categorias Ativas</p>
              <h3 className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subcategorias</p>
              <h3 className="text-2xl font-bold">{categories.filter(c => c.parent_id).length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex justify-end items-center gap-2">
          <ImportExportManager
            entityName="Categorias"
            onImport={handleImport}
            onExport={handleExport}
            expectedColumns={[
              { key: 'name', label: 'Nome', required: true },
              { key: 'slug', label: 'Slug', required: false },
              { key: 'sort_order', label: 'Ordem', required: false, type: 'number' }
            ]}
            templateData={[
              { Nome: 'Canetas', Slug: 'canetas', Ordem: 1 }
            ]}
          />
          {canEdit && (
            <Button onClick={() => { setEditingCategory(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Categoria
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <ListIcon className="h-4 w-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2">
            <Network className="h-4 w-4" /> Árvore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <AdminDataTable
            data={categories}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Buscar por nome ou slug..."
            searchKey="name"
          />
        </TabsContent>

        <TabsContent value="tree">
          <CategoryTreeDiagram 
            categories={categories} 
            onEdit={(cat) => { setEditingCategory(cat); setIsFormOpen(true); }} 
          />
        </TabsContent>
      </Tabs>

      <CategoryFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        category={editingCategory} 
        onSave={handleSave} 
        categories={categories}
        isLoading={isLoading}
      />
    </div>
  );
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  sort_order: number;
}

function categoryFormAuditState(formData: CategoryFormData): Json {
  return {
    name: formData.name,
    slug: formData.slug,
    description: formData.description,
    parent_id: formData.parent_id,
    sort_order: formData.sort_order,
  };
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSave: (formData: CategoryFormData) => Promise<void>;
  categories: Category[];
  isLoading: boolean;
}

function CategoryFormDialog({ open, onOpenChange, category, onSave, categories, isLoading }: CategoryFormDialogProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    parent_id: null,
    sort_order: 0,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        parent_id: category.parent_id || null,
        sort_order: category.sort_order ?? 0,
      });
    } else {
      setFormData({ name: '', slug: '', description: '', parent_id: null, sort_order: 0 });
    }
  }, [category, open]);

  const validateSlug = (slug: string) => {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("O nome da categoria é obrigatório");
      return;
    }

    if (!validateSlug(formData.slug)) {
      toast.error("O slug deve conter apenas letras minúsculas, números e hifens (ex: categoria-exemplo)");
      return;
    }

    if (formData.sort_order < 0) {
      toast.error("A ordem não pode ser um valor negativo");
      return;
    }

    // Check for duplicate slug (excluding current category)
    const isDuplicateSlug = categories?.some((c: Category) => 
      c.slug === formData.slug && c.id !== category?.id
    );

    if (isDuplicateSlug) {
      toast.error("Este slug já está sendo usado por outra categoria");
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={() => {
        // Prevent default to control focus manually if needed, 
        // but Radix usually handles initial focus on first focusable element (Name input).
      }}>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>
            {category ? 'Altere as informações da categoria selecionada.' : 'Preencha os campos abaixo para criar uma nova categoria.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="parent">Categoria Pai</Label>
            <Select
              value={formData.parent_id || 'none'}
              onValueChange={(v) => setFormData({ ...formData, parent_id: v === 'none' ? null : v })}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {categories
                  ?.filter((c) => c.id !== category?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sort_order">Ordem</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
