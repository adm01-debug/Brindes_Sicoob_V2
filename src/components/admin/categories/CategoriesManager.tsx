import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, FolderTree, FileDown, FileUp, MoreHorizontal, ChevronRight, ChevronDown, ListFilter, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function CategoriesManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

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

  const handleSave = async (formData: any) => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update(formData)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success("Categoria atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(formData);
        if (error) throw error;
        toast.success("Categoria criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success("Categoria excluída com sucesso");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria");
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Category Stats */}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Categorias</CardTitle>
            <CardDescription>Gerencie as categorias de produtos e suas hierarquias</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileUp className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar
            </Button>
            <Button onClick={() => { setEditingCategory(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou descrição..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <ListFilter className="h-4 w-4" /> Filtros
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Carregando categorias...</TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma categoria encontrada</TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {category.parent_id && <ChevronRight className="h-4 w-4 text-muted-foreground ml-4" />}
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>{category.slug}</TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(category); setIsFormOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CategoryFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        category={editingCategory} 
        onSave={handleSave} 
        categories={categories}
      />
    </div>
  );
}

function CategoryFormDialog({ open, onOpenChange, category, onSave, categories }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    slug: '',
    description: '',
    parent_id: null,
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        parent_id: null,
        is_active: true,
        sort_order: 0
      });
    }
  }, [category, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input 
              id="name" 
              className="col-span-3" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">Slug</Label>
            <Input 
              id="slug" 
              className="col-span-3" 
              value={formData.slug} 
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parent" className="text-right">Superior</Label>
            <div className="col-span-3">
              <Select 
                value={formData.parent_id || "root"} 
                onValueChange={(val) => setFormData({ ...formData, parent_id: val === "root" ? null : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria Raiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Categoria Raiz</SelectItem>
                  {categories.filter((c: any) => c.id !== category?.id).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descrição</Label>
            <Textarea 
              id="description" 
              className="col-span-3" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order" className="text-right">Ordem</Label>
            <Input 
              id="order" 
              type="number" 
              className="col-span-3" 
              value={formData.sort_order} 
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Ativo</Label>
            <div className="col-span-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={formData.is_active} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm">Habilitado</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(formData)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
