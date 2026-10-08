import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, X, Layers, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExternalCategoriesQuery, type ExternalCategory } from "@/hooks/useExternalCategoriesQuery";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";

interface ExternalCategoryFilterProps {
  selectedCategories: string[]; // UUIDs
  onCategoriesChange: (categories: string[]) => void;
  compact?: boolean;
}

interface CategoryNode extends ExternalCategory {
  children: CategoryNode[];
}

import { toTitleCase } from "@/lib/textUtils";

function buildCategoryTree(categories: ExternalCategory[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];
  categories.forEach(category => categoryMap.set(category.id, { ...category, children: [] }));
  categoryMap.forEach(category => {
    const parent = category.parent_id ? categoryMap.get(category.parent_id) : undefined;
    if (parent) parent.children.push(category); else roots.push(category);
  });
  const sortByName = (a: CategoryNode, b: CategoryNode) => a.name.localeCompare(b.name);
  roots.sort(sortByName);
  categoryMap.forEach(category => category.children.sort(sortByName));
  return roots;
}

function filterCategoryNode(node: CategoryNode, query: string): CategoryNode | null {
  const children = node.children.map(child => filterCategoryNode(child, query)).filter((child): child is CategoryNode => child !== null);
  if (node.name.toLowerCase().includes(query) || children.length > 0) return { ...node, children };
  return null;
}

function filterCategoryTree(tree: CategoryNode[], search: string): CategoryNode[] {
  const query = search.trim().toLowerCase();
  if (!query) return tree;
  return tree.map(node => filterCategoryNode(node, query)).filter((node): node is CategoryNode => node !== null);
}

function getTotalCount(node: CategoryNode): number {
  return (node.products_count ?? 0) + node.children.reduce((sum, child) => sum + getTotalCount(child), 0);
}

interface CategoryTreeNodeProps {
  node: CategoryNode;
  level?: number;
  expandedIds: Set<string>;
  selectedCategories: string[];
  categoryIcons: Parameters<typeof getCategoryIcon>[1];
  onToggleExpand: (id: string) => void;
  onToggleCategory: (id: string) => void;
}

function CategoryExpandButton({ node, selected, expanded, onToggle }: { node: CategoryNode; selected: boolean; expanded: boolean; onToggle: () => void }) {
  if (node.children.length === 0) return <span className="w-4" />;
  return <button type="button" onClick={onToggle} className={cn("p-0.5 rounded transition-colors", selected ? "hover:bg-orange/10" : "hover:bg-muted")}>{expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}</button>;
}

function CategoryCount({ node, selected }: { node: CategoryNode; selected: boolean }) {
  const totalCount = getTotalCount(node);
  if (totalCount === 0) return null;
  const directCount = node.products_count ?? 0;
  const title = node.children.length > 0 ? `${totalCount} produtos (${directCount} diretos)` : `${totalCount} produtos`;
  const label = totalCount >= 1000 ? `${(totalCount / 1000).toFixed(1)}k` : totalCount;
  return <span className={cn("flex-shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-full", selected ? "bg-orange/20 text-orange" : "bg-muted text-muted-foreground")} title={title}>{label}</span>;
}

function CategoryNodeChildren(props: CategoryTreeNodeProps) {
  const { node, level = 0, expandedIds, selectedCategories, categoryIcons, onToggleExpand, onToggleCategory } = props;
  if (node.children.length === 0 || !expandedIds.has(node.id)) return null;
  return <div className="ml-2">{node.children.map(child => <CategoryTreeNode key={child.id} node={child} level={level + 1} expandedIds={expandedIds} selectedCategories={selectedCategories} categoryIcons={categoryIcons} onToggleExpand={onToggleExpand} onToggleCategory={onToggleCategory} />)}</div>;
}

function CategoryTreeNode({ node, level = 0, expandedIds, selectedCategories, categoryIcons, onToggleExpand, onToggleCategory }: CategoryTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedCategories.includes(node.id);
  return <div className="select-none"><div className={cn("flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors", isSelected ? "bg-orange/10 ring-1 ring-inset ring-orange/20" : "hover:bg-muted/50")} style={{ paddingLeft: `${8 + level * 16}px` }}><CategoryExpandButton node={node} selected={isSelected} expanded={isExpanded} onToggle={() => onToggleExpand(node.id)} /><Checkbox id={`ext-cat-${node.id}`} checked={isSelected} onCheckedChange={() => onToggleCategory(node.id)} className="h-4 w-4 rounded-full border-orange/60 data-[state=checked]:border-orange data-[state=checked]:bg-orange data-[state=checked]:text-orange-foreground" /><Label htmlFor={`ext-cat-${node.id}`} className="flex-1 text-sm cursor-pointer flex items-center gap-1.5 min-w-0"><span className="flex-shrink-0">{getCategoryIcon(node.name, categoryIcons)}</span><span className="truncate">{toTitleCase(node.name)}</span></Label><CategoryCount node={node} selected={isSelected} /></div><CategoryNodeChildren node={node} level={level} expandedIds={expandedIds} selectedCategories={selectedCategories} categoryIcons={categoryIcons} onToggleExpand={onToggleExpand} onToggleCategory={onToggleCategory} /></div>;
}

function SelectedCategories({ selected, categories, onToggle, onClear }: { selected: string[]; categories: ExternalCategory[]; onToggle: (id: string) => void; onClear: () => void }) {
  if (selected.length === 0) return null;
  const visible = selected.slice(0, 5).map(id => categories.find(category => category.id === id)).filter((category): category is ExternalCategory => Boolean(category));
  return <div className="p-2 bg-orange/5 rounded-lg border border-orange/20"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-orange flex items-center gap-1.5"><Layers className="h-3 w-3" />Selecionadas ({selected.length})</span><button type="button" onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Limpar</button></div><div className="flex flex-wrap gap-1.5">{visible.map(category => <Badge key={category.id} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20" onClick={() => onToggle(category.id)}>{toTitleCase(category.name)}<X className="h-3 w-3 ml-1" /></Badge>)}{selected.length > 5 && <Badge variant="outline" className="text-xs">+{selected.length - 5} mais</Badge>}</div></div>;
}

function CategorySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar categoria..." value={value} onChange={event => onChange(event.target.value)} className="h-8 text-sm pl-8 pr-8" />{value && <button type="button" onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}</div>;
}

function CategoryStats({ count, selectedCount, fetching, onRefresh }: { count: number; selectedCount: number; fetching: boolean; onRefresh: () => void }) {
  return <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1"><span>{count} categorias</span><div className="flex items-center gap-2"><button type="button" onClick={onRefresh} disabled={fetching} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="Atualizar categorias"><RefreshCw className={cn("h-3 w-3", fetching && "animate-spin")} />{fetching ? "Atualizando..." : "Atualizar"}</button><span className="text-orange font-medium">{selectedCount} selecionadas</span></div></div>;
}

function CategoryTreeView({ tree, search, compact, selected, expandedIds, categoryIcons, onToggleExpand, onToggleCategory }: { tree: CategoryNode[]; search: string; compact: boolean; selected: string[]; expandedIds: Set<string>; categoryIcons: Parameters<typeof getCategoryIcon>[1]; onToggleExpand: (id: string) => void; onToggleCategory: (id: string) => void }) {
  const emptyMessage = search ? "Nenhuma categoria encontrada" : "Nenhuma categoria disponível";
  return <div className={cn("pr-2 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent", compact ? "max-h-52" : "max-h-[55vh]")} style={{ overscrollBehavior: 'contain' }}><div className="space-y-0.5">{tree.length > 0 ? tree.map(node => <CategoryTreeNode key={node.id} node={node} expandedIds={expandedIds} selectedCategories={selected} categoryIcons={categoryIcons} onToggleExpand={onToggleExpand} onToggleCategory={onToggleCategory} />) : <p className="text-xs text-muted-foreground text-center py-4">{emptyMessage}</p>}</div></div>;
}

export function ExternalCategoryFilter({ selectedCategories, onCategoriesChange, compact = false }: ExternalCategoryFilterProps) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { data: categoryIcons = [] } = useCategoryIcons();
  const { data: categories = [], isLoading, refetch, isFetching } = useExternalCategoriesQuery();
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const filteredTree = useMemo(() => filterCategoryTree(categoryTree, search), [categoryTree, search]);
  const toggleCategory = (categoryId: string) => onCategoriesChange(selectedCategories.includes(categoryId) ? selectedCategories.filter(id => id !== categoryId) : [...selectedCategories, categoryId]);
  const toggleExpand = (categoryId: string) => setExpandedIds(previous => { const next = new Set(previous); if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId); return next; });
  if (isLoading) return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-5/6" /></div>;
  return (
    <div className="space-y-3">
      <SelectedCategories selected={selectedCategories} categories={categories} onToggle={toggleCategory} onClear={() => onCategoriesChange([])} />
      <CategorySearch value={search} onChange={setSearch} />
      <CategoryStats count={categories.length} selectedCount={selectedCategories.length} fetching={isFetching} onRefresh={() => { void refetch(); }} />
      <CategoryTreeView tree={filteredTree} search={search} compact={compact} selected={selectedCategories} expandedIds={expandedIds} categoryIcons={categoryIcons} onToggleExpand={toggleExpand} onToggleCategory={toggleCategory} />
    </div>
  );
}
