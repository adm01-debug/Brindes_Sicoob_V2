/**
 * AdminTemplatesManager — Refactored orchestrator
 * Table/Grid views extracted to ./admin-templates/
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateDeleteDialog, TemplateCloneDialog } from "./AdminTemplateDialogs";
import { FileText, Search, Users, User, Filter, LayoutGrid, List, Download } from "lucide-react";
import { type QuoteTemplate, useQuoteTemplates } from "@/hooks/useQuoteTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { exportTemplatesToJson } from "@/utils/templateExport";
import { TemplateTableView } from "./admin-templates/TemplateTableView";
import { TemplateGridView } from "./admin-templates/TemplateGridView";

interface AdminTemplatesManagerProps {
  onEditTemplate?: (template: QuoteTemplate) => void;
}

interface Seller {
  id: string;
  full_name: string | null;
  email: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function calculateTotal(template: QuoteTemplate) {
  const itemsTotal = (template.items_data ?? []).reduce((sum, item) => {
    const personalizationCost = item.personalizations?.reduce(
      (personalizationSum, personalization) => personalizationSum
        + (personalization.unitCost || 0) * item.quantity + (personalization.setupCost || 0), 0) || 0;
    return sum + item.quantity * item.unitPrice + personalizationCost;
  }, 0);
  const discountPercent = template.discount_percent ?? 0;
  const discountAmount = template.discount_amount ?? 0;
  return itemsTotal - (discountPercent > 0 ? itemsTotal * (discountPercent / 100) : discountAmount);
}

function useTemplateSellers(templates: QuoteTemplate[]) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  useEffect(() => {
    const sellerIds = Array.from(new Set(templates.map((template) => template.seller_id)
      .filter((id): id is string => Boolean(id))));
    if (sellerIds.length === 0) { setSellers([]); return; }
    let cancelled = false;
    void supabase.from("profiles").select("user_id, full_name, email").in("user_id", sellerIds)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setSellers(data.map((profile) => ({
          id: profile.user_id, full_name: profile.full_name, email: profile.email ?? "",
        })));
      });
    return () => { cancelled = true; };
  }, [templates]);
  return sellers;
}

function useTemplateFilters(templates: QuoteTemplate[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("all");
  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = template.name.toLowerCase().includes(search)
      || (template.description?.toLowerCase().includes(search) ?? false);
    return matchesSearch && (selectedSellerId === "all" || template.seller_id === selectedSellerId);
  }), [templates, searchTerm, selectedSellerId]);
  const templatesBySeller = useMemo(() => filteredTemplates.reduce<Record<string, QuoteTemplate[]>>((grouped, template) => {
    const key = template.seller_id ?? "sem-vendedor";
    (grouped[key] ??= []).push(template);
    return grouped;
  }, {}), [filteredTemplates]);
  return { searchTerm, setSearchTerm, selectedSellerId, setSelectedSellerId, filteredTemplates, templatesBySeller };
}

function useTemplateActions(templates: QuoteTemplate[], deleteTemplate: (id: string) => Promise<void>, fetchTemplates: () => void) {
  const { user } = useAuth();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cloneTemplateId, setCloneTemplateId] = useState<string | null>(null);
  const [targetSellerId, setTargetSellerId] = useState("");
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTemplate(deleteConfirmId);
    setDeleteConfirmId(null);
  };
  const handleClone = async () => {
    if (!cloneTemplateId || !targetSellerId || !user) return;
    const source = templates.find((template) => template.id === cloneTemplateId);
    if (!source) return;
    try {
      const { error } = await supabase.from("quote_templates").insert({ ...source,
        items_data: source.items_data ? JSON.parse(JSON.stringify(source.items_data)) : null,
        created_by: user.id, seller_id: targetSellerId });
      if (error) throw error;
      toast.success("Template clonado com sucesso!"); fetchTemplates();
    } catch (error) { console.error("Error cloning template:", error); toast.error("Erro ao clonar template"); }
    finally { setCloneTemplateId(null); setTargetSellerId(""); }
  };
  return { deleteConfirmId, setDeleteConfirmId, cloneTemplateId, setCloneTemplateId, targetSellerId,
    setTargetSellerId, handleDelete, handleClone };
}

type TemplateFilters = ReturnType<typeof useTemplateFilters>;
type TemplateActions = ReturnType<typeof useTemplateActions>;

function TemplatesToolbar({ filters, sellers, viewMode, setViewMode }: {
  filters: TemplateFilters; sellers: Seller[]; viewMode: "grid" | "table"; setViewMode: (mode: "grid" | "table") => void;
}) {
  const exportName = `templates-all-${new Date().toISOString().split('T')[0]}.json`;
  return <><div className="flex flex-col sm:flex-row items-start sm:items-center gap-3"><div className="relative flex-1 w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder="Buscar templates..." value={filters.searchTerm}
      onChange={(event) => filters.setSearchTerm(event.target.value)} className="pl-9" />
  </div><div className="flex items-center gap-2 w-full sm:w-auto"><Select value={filters.selectedSellerId} onValueChange={filters.setSelectedSellerId}>
    <SelectTrigger className="w-full sm:w-[200px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filtrar por vendedor" /></SelectTrigger>
    <SelectContent><SelectItem value="all"><span className="flex items-center gap-2"><Users className="h-4 w-4" />Todos os vendedores</span></SelectItem>
      <Separator className="my-1" />{sellers.map((seller) => <SelectItem key={seller.id} value={seller.id}>
        <span className="flex items-center gap-2"><User className="h-4 w-4" />{seller.full_name || seller.email}</span></SelectItem>)}</SelectContent>
  </Select>{filters.filteredTemplates.length > 0 && <Button variant="outline" size="sm"
    onClick={() => exportTemplatesToJson(filters.filteredTemplates, exportName)}><Download className="h-4 w-4 mr-2" />Exportar</Button>}
    <div className="flex items-center border rounded-md"><Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" aria-label="Lista"
      className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
      <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" aria-label="Grid"
        className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button></div>
  </div></div><div className="flex items-center gap-4 text-sm text-muted-foreground">
    <span>{filters.filteredTemplates.length} templates encontrados</span><span>•</span>
    <span>{Object.keys(filters.templatesBySeller).length} vendedores</span></div></>;
}

function TemplatesResult({ filters, sellers, viewMode, actions, onEdit }: {
  filters: TemplateFilters; sellers: Seller[]; viewMode: "grid" | "table"; actions: TemplateActions;
  onEdit?: (template: QuoteTemplate) => void;
}) {
  const getSellerName = (id: string) => {
    const seller = sellers.find((candidate) => candidate.id === id);
    return seller?.full_name || seller?.email || "Vendedor desconhecido";
  };
  const openClone = (id: string) => actions.setCloneTemplateId(id);
  if (filters.filteredTemplates.length === 0) return <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
    <FileText className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="font-display font-medium text-lg mb-2">Nenhum template encontrado</h3>
    <p className="text-muted-foreground">{filters.searchTerm || filters.selectedSellerId !== "all" ? "Tente ajustar os filtros de busca" : "Não há templates cadastrados no sistema"}</p>
  </CardContent></Card>;
  const shared = { getSellerName, formatCurrency, calculateTotal, onEdit, onClone: openClone, onDelete: actions.setDeleteConfirmId };
  return viewMode === "table" ? <TemplateTableView templates={filters.filteredTemplates} {...shared} />
    : <TemplateGridView templatesBySeller={filters.templatesBySeller} {...shared} />;
}

export function AdminTemplatesManager({ onEditTemplate }: AdminTemplatesManagerProps) {
  const { templates, isLoading, fetchTemplates, deleteTemplate } = useQuoteTemplates();
  const sellers = useTemplateSellers(templates);
  const filters = useTemplateFilters(templates);
  const actions = useTemplateActions(templates, deleteTemplate, fetchTemplates);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );

  return <div className="space-y-4"><TemplatesToolbar filters={filters} sellers={sellers} viewMode={viewMode} setViewMode={setViewMode} />
    <TemplatesResult filters={filters} sellers={sellers} viewMode={viewMode} actions={actions} onEdit={onEditTemplate} />
    <TemplateDeleteDialog open={Boolean(actions.deleteConfirmId)} onClose={() => actions.setDeleteConfirmId(null)} onConfirm={actions.handleDelete} />
    <TemplateCloneDialog open={Boolean(actions.cloneTemplateId)} onClose={() => { actions.setCloneTemplateId(null); actions.setTargetSellerId(""); }}
      onConfirm={actions.handleClone} sellers={sellers} targetSellerId={actions.targetSellerId} setTargetSellerId={actions.setTargetSellerId} />
  </div>;
}
