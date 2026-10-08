import { useState, useCallback, type MouseEvent } from 'react';
import { ChevronRight, Folder, X, ChevronLeft, Layers } from 'lucide-react';
import { useCategoriesTree, type CategoryNode, type CategoryTreeItem } from '@/hooks/useCategoriesTree';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/textUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface CategorySidebarPanelProps {
  onSelectCategory?: (categoryId: string | null, categoryName?: string) => void;
  selectedCategoryId?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

interface TreeNodeProps {
  node: CategoryNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: CategoryNode) => void;
}

function TreeNodeMarker({ hasChildren, isExpanded, isSelected }: { hasChildren: boolean; isExpanded: boolean; isSelected: boolean }) {
  if (hasChildren) {
    return <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="text-muted-foreground"><ChevronRight className="w-4 h-4" /></motion.div>;
  }
  return <div className="w-4 h-4 flex items-center justify-center"><motion.div className={cn("w-2 h-2 rounded-full transition-all duration-200", isSelected ? "bg-primary scale-110" : "bg-primary/50 hover:bg-primary/70")} animate={{ scale: isSelected ? 1.2 : 1 }} transition={{ duration: 0.2 }} /></div>;
}

function TreeNodeChildren({ node, level, selectedId, expandedIds, onToggle, onSelect }: TreeNodeProps) {
  return <AnimatePresence>{node.children.length > 0 && expandedIds.has(node.id) && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">{node.children.map(child => <TreeNode key={child.id} node={child} level={level + 1} selectedId={selectedId} expandedIds={expandedIds} onToggle={onToggle} onSelect={onSelect} />)}</motion.div>}</AnimatePresence>;
}

// Componente de nó da árvore com animação
function TreeNode({ node, level, selectedId, expandedIds, onToggle, onSelect }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(node);
    if (hasChildren) onToggle(node.id);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className={cn("flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/60", isSelected && "bg-primary/15 text-primary font-semibold border-l-2 border-primary")} style={{ paddingLeft: `${level * 16 + 12}px` }} onClick={handleClick}>
        <TreeNodeMarker hasChildren={hasChildren} isExpanded={isExpanded} isSelected={isSelected} />
        {node.icon && <span className="text-base">{node.icon}</span>}
        <span className="truncate text-sm flex-1">{toTitleCase(node.name)}</span>
        {hasChildren && <Badge variant={isSelected ? "default" : "outline"} className="ml-auto text-[10px] px-1.5 py-0 h-5 opacity-60">{node.children.length}</Badge>}
      </div>
      <TreeNodeChildren node={node} level={level} selectedId={selectedId} expandedIds={expandedIds} onToggle={onToggle} onSelect={onSelect} />
    </motion.div>
  );
}

function CollapsedPanel({ className, total, onToggle }: { className?: string; total: number; onToggle?: () => void }) {
  return <div className={cn("w-12 border-r bg-card flex flex-col items-center py-4 gap-2", className)}><Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8" aria-label="Avançar"><ChevronRight className="h-4 w-4" /></Button><Separator className="w-8" /><div className="flex flex-col gap-1 items-center"><Layers className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{total}</span></div></div>;
}

function PanelStatus({ className, loading, error }: { className?: string; loading: boolean; error?: string | null }) {
  if (loading) return <div className={cn("w-64 border-r bg-card p-4 space-y-3", className)}><Skeleton className="h-8 w-full" /><Separator /><div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4 ml-4" /><Skeleton className="h-6 w-3/4 ml-4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4 ml-4" /></div></div>;
  if (error) return <div className={cn("w-64 border-r bg-card p-4", className)}><div className="text-center text-destructive"><Folder className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm font-medium">Erro ao carregar</p><p className="text-xs text-muted-foreground">{error}</p></div></div>;
  return null;
}

function PanelHeader({ total, searchQuery, selected, onSearch, onExpand, onCollapse, onClear, onToggle }: { total: number; searchQuery: string; selected: boolean; onSearch: (value: string) => void; onExpand: () => void; onCollapse: () => void; onClear: () => void; onToggle?: () => void }) {
  return <div className="p-3 border-b space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /><h3 className="font-display font-semibold text-sm">Categorias</h3></div><div className="flex items-center gap-1"><Badge variant="outline" className="text-[10px]">{total}</Badge>{onToggle && <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7" aria-label="Voltar"><ChevronLeft className="h-4 w-4" /></Button>}</div></div><Input placeholder="Buscar categoria..." value={searchQuery} onChange={(event) => onSearch(event.target.value)} className="h-8 text-sm" /><div className="flex items-center justify-between"><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onExpand}>Expandir</Button><Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onCollapse}>Colapsar</Button></div>{selected && <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive" onClick={onClear}><X className="h-3 w-3 mr-1" />Limpar</Button>}</div></div>;
}

function SelectionBreadcrumb({ path }: { path: CategoryTreeItem[] }) {
  if (path.length === 0) return null;
  return <div className="px-3 py-2 bg-primary/5 border-b"><p className="text-[10px] text-muted-foreground mb-1">Selecionado:</p><div className="flex items-center gap-1 flex-wrap">{path.map((category, index) => <span key={category.id} className="flex items-center text-xs"><span className={cn("truncate max-w-[80px]", index === path.length - 1 && "font-semibold text-primary")}>{category.name}</span>{index < path.length - 1 && <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground" />}</span>)}</div></div>;
}

function SearchResults({ results, selectedId, onSelect }: { results: CategoryTreeItem[]; selectedId: string | null; onSelect: (item: CategoryTreeItem) => void }) {
  if (results.length === 0) return <div className="text-center py-8 text-muted-foreground px-4"><Folder className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma categoria</p><p className="text-[10px]">Tente outra busca</p></div>;
  return <div className="px-2"><p className="text-[10px] text-muted-foreground px-2 mb-2">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>{results.map(category => <div key={category.id} className={cn("flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-accent/60 transition-colors", selectedId === category.id && "bg-primary/15 text-primary")} onClick={() => onSelect(category)}><Folder className="w-4 h-4 text-warning flex-shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{category.name}</p>{category.tree_structure && <p className="text-[10px] text-muted-foreground truncate">{category.tree_structure}</p>}</div></div>)}</div>;
}

function TreeContent({ query, results, tree, selectedId, expandedIds, onToggle, onSelect }: { query: string; results: CategoryTreeItem[]; tree: CategoryNode[]; selectedId: string | null; expandedIds: Set<string>; onToggle: (id: string) => void; onSelect: (item: CategoryNode | CategoryTreeItem) => void }) {
  if (query) return <SearchResults results={results} selectedId={selectedId} onSelect={onSelect} />;
  if (tree.length === 0) return <div className="text-center py-8 text-muted-foreground px-4"><Folder className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma categoria</p></div>;
  return <>{tree.map(node => <TreeNode key={node.id} node={node} level={0} selectedId={selectedId} expandedIds={expandedIds} onToggle={onToggle} onSelect={onSelect} />)}</>;
}

function collectExpandableIds(nodes: CategoryNode[], ids = new Set<string>()): Set<string> {
  nodes.forEach(node => { if (node.children.length > 0) { ids.add(node.id); collectExpandableIds(node.children, ids); } });
  return ids;
}

export function CategorySidebarPanel({ onSelectCategory, selectedCategoryId, isCollapsed = false, onToggleCollapse, className }: CategorySidebarPanelProps) {
  const { tree, searchCategories, isLoading, error, stats, getPath } = useCategoriesTree();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CategoryTreeItem[]>([]);

  const selectedBreadcrumb = selectedCategoryId ? getPath(selectedCategoryId) : [];
  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const handleSelect = useCallback((category: CategoryNode | CategoryTreeItem) => {
    onSelectCategory?.(category.id, category.name);
    if ('parent_id' in category && category.parent_id) {
      const path = getPath(category.id);
      setExpandedIds(prev => {
        const next = new Set(prev);
        path.slice(0, -1).forEach(item => next.add(item.id));
        return next;
      });
    }
  }, [onSelectCategory, getPath]);
  const handleClearSelection = useCallback(() => {
    onSelectCategory?.(null);
    setSearchQuery('');
    setSearchResults([]);
  }, [onSelectCategory]);
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSearchResults(query.trim() ? searchCategories(query) : []);
  }, [searchCategories]);
  const expandAll = useCallback(() => setExpandedIds(collectExpandableIds(tree)), [tree]);
  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  if (isCollapsed) return <CollapsedPanel className={className} total={stats.total} onToggle={onToggleCollapse} />;
  if (isLoading || error) return <PanelStatus className={className} loading={isLoading} error={error} />;

  return (
    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3 }} className={cn("border-r bg-card flex flex-col h-full", className)}>
      <PanelHeader total={stats.total} searchQuery={searchQuery} selected={Boolean(selectedCategoryId)} onSearch={handleSearch} onExpand={expandAll} onCollapse={collapseAll} onClear={handleClearSelection} onToggle={onToggleCollapse} />
      <SelectionBreadcrumb path={selectedBreadcrumb} />
      <ScrollArea className="flex-1"><div className="py-2"><TreeContent query={searchQuery} results={searchResults} tree={tree} selectedId={selectedCategoryId ?? null} expandedIds={expandedIds} onToggle={handleToggle} onSelect={handleSelect} /></div></ScrollArea>
      <div className="p-2 border-t bg-muted/30"><div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span>{stats.levels} níveis</span><span>•</span><span>{stats.roots} raízes</span></div></div>
    </motion.div>
  );
}

export default CategorySidebarPanel;
