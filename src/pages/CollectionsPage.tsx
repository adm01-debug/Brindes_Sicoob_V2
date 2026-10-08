import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderOpen, Package,
  Search, Star, FolderHeart,
  FileText, CheckSquare, X, Sparkles, ArrowRight,
} from "lucide-react";
import { CollectionGridCard } from "@/components/collections/CollectionGridCard";
import { CollectionListItem } from "@/components/collections/CollectionListItem";
import { CollectionTableView } from "@/components/collections/CollectionTableView";
import { ExternalCollectionTableView } from "@/components/collections/ExternalCollectionTableView";
import { CollectionFormDialog } from "@/components/collections/CollectionFormDialog";
import { ExternalCollectionCard } from "@/components/collections/ExternalCollectionCard";
import { CollectionsHeatmap } from "@/components/collections/CollectionsHeatmap";
import { CollectionsEmptyStateSmart } from "@/components/collections/CollectionsEmptyStateSmart";
import { useCollectionsGlobalShortcuts } from "@/hooks/useCollectionsGlobalShortcuts";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollectionsPageState } from "./collections/useCollectionsPageState";

function relativeTime(dateStr: string | undefined) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
}

type CollectionsPageState = ReturnType<typeof useCollectionsPageState>;

function CollectionStats({ state }: { state: CollectionsPageState }) {
  const stats = [
    { icon: FolderHeart, value: state.totalCollections, label: "Total Coleções", color: "text-primary" },
    { icon: FolderOpen, value: state.externalCollections.length, label: "Coleções Catálogo", color: "text-brand" },
    { icon: Star, value: state.localCollections.length, label: "Minhas Coleções", color: "text-accent" },
    { icon: Package, value: state.totalProducts, label: "Produtos", color: "text-success" },
  ];
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map((stat, idx) => (
    <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08, type: "spring", stiffness: 400, damping: 25 }} className="stat-card flex items-center gap-3 group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-default">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"><stat.icon className={cn("h-5 w-5", stat.color)} /></div>
      <div><p className="text-2xl font-display font-bold text-foreground">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
    </motion.div>
  ))}</div>;
}

function toggleCollectionSelection(state: CollectionsPageState) {
  if (state.isSelectionMode) {
    state.clearSelection();
    return;
  }
  const firstCollection = state.localCollections[0];
  if (firstCollection) state.toggleSelectCollection(firstCollection.id);
}

function CollectionsToolbar({ state }: { state: CollectionsPageState }) {
  return <div className="flex items-center gap-3">
    <Button size="sm" className="h-8 px-3 text-xs" onClick={() => state.setIsCreateOpen(true)}><Plus className="h-3 w-3 mr-1" />Nova Coleção</Button>
    <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar coleções" placeholder="Buscar coleções..." value={state.searchQuery} onChange={(event) => state.setSearchQuery(event.target.value)} className="pl-9" /></div>
    <div className="hidden sm:flex items-center gap-2 ml-auto">
      <CollectionsHeatmap />
      {state.localCollections.length > 0 && <Button size="sm" variant={state.isSelectionMode ? "default" : "outline"} className="h-8 px-3 text-xs gap-1.5" onClick={() => toggleCollectionSelection(state)}><CheckSquare className="h-3.5 w-3.5" />{state.isSelectionMode ? "Selecionando" : "Selecionar"}</Button>}
      <LayoutPopover viewMode={state.viewMode} setViewMode={state.setViewMode} gridColumns={state.gridColumns} setGridColumns={state.setGridColumns} />
    </div>
  </div>;
}

function SelectionSummary({ state }: { state: CollectionsPageState }) {
  if (state.selectedSummary.uniqueProductCount === 0) return <>Nenhum produto nas coleções selecionadas</>;
  return <><Package className="h-3 w-3 inline mr-1" />{state.selectedSummary.uniqueProductCount} material{state.selectedSummary.uniqueProductCount > 1 ? "s" : ""} únicos{state.selectedSummary.names.length <= 3 && <> · {state.selectedSummary.names.join(", ")}</>}</>;
}

function CollectionSelectionBar({ state }: { state: CollectionsPageState }) {
  return <AnimatePresence>{state.isSelectionMode && <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-30 rounded-xl overflow-hidden">
    <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-2 border-primary/30 backdrop-blur-xl rounded-xl px-5 py-4"><div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0"><motion.div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}><span className="font-display font-bold text-lg">{state.selectedCollectionIds.size}</span></motion.div><div className="min-w-0">
        <p className="font-display font-bold text-sm text-foreground">{state.selectedCollectionIds.size} coleção{state.selectedCollectionIds.size > 1 ? "ões" : ""} selecionada{state.selectedCollectionIds.size > 1 ? "s" : ""}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[300px]"><SelectionSummary state={state} /></p>
      </div></div>
      <div className="flex items-center gap-2">
        {state.selectedCollectionIds.size < state.localCollections.length && <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}><Button size="sm" variant="ghost" onClick={state.selectAllLocal} className="gap-1.5 text-xs"><CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">Selecionar Todas</span></Button></motion.div>}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}><Button size="default" className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow" onClick={state.handleSendSelectedToQuote} disabled={state.selectedSummary.uniqueProductCount === 0}><FileText className="h-4 w-4" />Criar Orçamento<ArrowRight className="h-4 w-4" /></Button></motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}><Button size="sm" variant="outline" onClick={state.clearSelection} className="gap-1.5 text-xs hover:text-destructive hover:border-destructive/50 transition-colors"><X className="h-3.5 w-3.5" />Limpar</Button></motion.div>
      </div>
    </div></div>
  </motion.div>}</AnimatePresence>;
}

function CollectionsHint({ state }: { state: CollectionsPageState }) {
  const isVisible = !state.isSelectionMode && !state.hintDismissed && state.localCollections.length > 0;
  return <AnimatePresence>{isVisible && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/40 border border-border/50"><Sparkles className="h-4 w-4 text-primary shrink-0" /><p className="text-xs text-muted-foreground flex-1"><span className="font-medium text-foreground">Dica:</span> Selecione coleções marcando o checkbox nos cards para enviar todos os produtos para um orçamento de uma vez.</p><Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => state.setHintDismissed(true)}><X className="h-3.5 w-3.5" /></Button></motion.div>}</AnimatePresence>;
}

function LocalCollectionCards({ state }: { state: CollectionsPageState }) {
  return <div className={state.gridClasses}>{state.filteredLocal.map((collection, idx) => {
    const products = state.getCollectionProducts(collection.id);
    const sharedProps = {
      collection,
      isSelected: state.selectedCollectionIds.has(collection.id),
      onToggleSelect: () => state.toggleSelectCollection(collection.id),
      onNavigate: () => state.navigate(`/colecoes/${collection.id}`),
      onEdit: () => state.openEdit(collection),
      onClone: () => state.handleClone(collection),
      onToggleFeatured: () => state.updateCollection(collection.id, { isFeatured: !collection.isFeatured }),
      onDelete: () => state.setDeleteConfirm(collection.id),
      updatedAgo: relativeTime(collection.updatedAt), index: idx,
    };
    if (state.viewMode === "list") return <CollectionListItem key={collection.id} previewImage={products[0]?.images?.[0]} {...sharedProps} />;
    return <CollectionGridCard key={collection.id} products={products} isSelectionMode={state.isSelectionMode} {...sharedProps} />;
  })}</div>;
}

function LocalCollectionsContent({ state }: { state: CollectionsPageState }) {
  if (state.filteredLocal.length === 0 && state.localCollections.length > 0 && state.searchQuery) return <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10"><Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><h3 className="font-display text-lg font-semibold text-foreground mb-1">Nenhuma coleção encontrada</h3><p className="text-muted-foreground text-sm">Nenhuma coleção corresponde a "{state.searchQuery}"</p></div>;
  if (state.filteredLocal.length === 0) return <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}><CollectionsEmptyStateSmart onAddProduct={() => state.setIsCreateOpen(true)} /></motion.div>;
  if (state.viewMode !== "table") return <LocalCollectionCards state={state} />;
  return <CollectionTableView collections={state.filteredLocal} getCollectionProducts={state.getCollectionProducts} selectedCollectionIds={state.selectedCollectionIds} isSelectionMode={state.isSelectionMode} onToggleSelect={state.toggleSelectCollection} onNavigate={(id) => state.navigate(`/colecoes/${id}`)} onEdit={state.openEdit} onClone={state.handleClone} onToggleFeatured={(collection) => state.updateCollection(collection.id, { isFeatured: !collection.isFeatured })} onDelete={state.setDeleteConfirm} relativeTime={relativeTime} />;
}

function LocalCollectionsSection({ state }: { state: CollectionsPageState }) {
  return <div className="space-y-3"><div className="flex items-center gap-2"><FolderHeart className="h-4 w-4 text-primary" /><h2 data-testid="page-title-colecoes" className="font-display text-lg font-semibold">Minhas Coleções</h2><Badge variant="secondary" className="text-xs">{state.localCollections.length}</Badge></div><LocalCollectionsContent state={state} /></div>;
}

function duplicateExternalCollection(state: CollectionsPageState, collection: CollectionsPageState["externalCollections"][number]) {
  state.createCollection(collection.name, collection.description || undefined, collection.color || state.defaultColors[0], collection.icon || state.defaultIcons[0]);
}

function ExternalCollectionsContent({ state }: { state: CollectionsPageState }) {
  if (state.isLoadingExternal) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-64 rounded-xl" />)}</div>;
  if (state.viewMode === "table") return <ExternalCollectionTableView collections={state.filteredExternal} productCounts={state.externalProductCounts} onNavigate={(id) => state.navigate(`/colecoes/${id}`)} onDuplicate={(collection) => duplicateExternalCollection(state, collection)} />;
  return <div className={state.gridClasses}>{state.filteredExternal.map((collection, idx) => <ExternalCollectionCard key={collection.id} collection={collection} productCount={state.externalProductCounts?.get(collection.id)} viewMode={state.viewMode === "list" ? "list" : "grid"} onNavigate={() => state.navigate(`/colecoes/${collection.id}`)} onDuplicate={() => duplicateExternalCollection(state, collection)} index={idx} />)}</div>;
}

function ExternalCollectionsSection({ state }: { state: CollectionsPageState }) {
  if (state.externalCollections.length === 0 && !state.isLoadingExternal) return null;
  return <div className="space-y-3"><div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" /><h2 className="font-display text-lg font-semibold">Coleções do Catálogo</h2></div><ExternalCollectionsContent state={state} /></div>;
}

function CollectionDialogs({ state }: { state: CollectionsPageState }) {
  const closeForm = () => { state.setIsCreateOpen(false); state.setEditingCollection(null); state.resetForm(); };
  return <><CollectionFormDialog open={state.isCreateOpen || Boolean(state.editingCollection)} isEditing={Boolean(state.editingCollection)} formData={state.formData} onFormChange={state.setFormData} onSubmit={state.editingCollection ? state.handleUpdate : state.handleCreate} onClose={closeForm} defaultColors={state.defaultColors} defaultIcons={state.defaultIcons} /><AlertDialog open={Boolean(state.deleteConfirm)} onOpenChange={() => state.setDeleteConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir coleção?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Os produtos não serão excluídos, apenas removidos desta coleção.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={state.handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

export default function CollectionsPage() {
  useCollectionsGlobalShortcuts();
  const state = useCollectionsPageState();
  return <><PageSEO title="Coleções" description="Organize seus produtos favoritos em coleções personalizadas." path="/colecoes" /><div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"><CollectionStats state={state} /><CollectionsToolbar state={state} /><CollectionSelectionBar state={state} /><CollectionsHint state={state} /><LocalCollectionsSection state={state} /><ExternalCollectionsSection state={state} /></div><CollectionDialogs state={state} /></>;
}
