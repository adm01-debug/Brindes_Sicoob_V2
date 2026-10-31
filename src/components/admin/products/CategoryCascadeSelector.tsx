/**
 * CategoryCascadeSelector — Seleção de categoria com cascata de 2+ níveis,
 * breadcrumb persistente e navegação em árvore via dialog.
 */
import { useMemo, useState } from "react";
import { useExternalCategoriesQuery, type ExternalCategory } from '@/hooks/useExternalCategoriesQuery';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight, Folder, FolderOpen, Check, Search, TreePine, X, Layers, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewCategoryDialog } from './NewCategoryDialog';

interface CategoryCascadeSelectorProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

interface CatNode extends ExternalCategory {
  children: CatNode[];
  fullPath: string[];
}

function buildTree(categories: ExternalCategory[]): { roots: CatNode[]; nodeMap: Map<string, CatNode> } {
  const map = new Map<string, CatNode>();
  const roots: CatNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [], fullPath: [] });
  }
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function setPaths(node: CatNode, ancestors: string[]) {
    node.fullPath = [...ancestors, node.name];
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of node.children) setPaths(child, node.fullPath);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const r of roots) setPaths(r, []);

  return { roots, nodeMap: map };
}

// ─── Cascade Selects ───────────────────────────
function CascadeSelects({
  roots,
  nodeMap,
  value,
  onChange,
}: {
  roots: CatNode[];
  nodeMap: Map<string, CatNode>;
  value: string;
  onChange: (id: string) => void;
}) {
  const selectedChain = useMemo(() => {
    if (!value) return [];
    const chain: string[] = [];
    let current = nodeMap.get(value);
    while (current) {
      chain.unshift(current.id);
      current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
    }
    return chain;
  }, [value, nodeMap]);

  const levels = useMemo(() => {
    const result: { items: CatNode[]; selectedId: string }[] = [];
    result.push({ items: roots, selectedId: selectedChain[0] || '' });
    for (let i = 0; i < selectedChain.length; i++) {
      const selectedId = selectedChain[i];
      if (!selectedId) continue;
      const node = nodeMap.get(selectedId);
      if (node && node.children.length > 0) {
        result.push({ items: node.children, selectedId: selectedChain[i + 1] || '' });
      }
    }
    return result;
  }, [roots, nodeMap, selectedChain]);

  const handleChange = (levelIndex: number, newId: string) => {
    onChange(newId);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {levels.map((level, i) => (
        <div key={i} className="flex items-center gap-2 min-w-0">
          {i > 0 && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/50">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <Select
            value={level.selectedId || undefined}
            onValueChange={(v) => handleChange(i, v)}
          >
            <SelectTrigger className={cn(
              "h-9 text-xs min-w-[160px] max-w-[220px] rounded-lg border-border/60",
              "bg-background/50 hover:bg-accent/30 transition-all duration-200",
              level.selectedId && "border-primary/30 bg-primary/5"
            )}>
              <div className="flex items-center gap-1.5">
                <Folder className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  level.selectedId ? "text-primary" : "text-muted-foreground"
                )} />
                <SelectValue placeholder={i === 0 ? 'Categoria raiz...' : 'Subcategoria...'} />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {level.items.map(item => (
                <SelectItem key={item.id} value={item.id} className="text-xs py-2">
                  <span className="flex items-center gap-2">
                    {item.children.length > 0 ? (
                      <Folder className="h-3.5 w-3.5 text-primary/60" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border/50" />
                    )}
                    <span className="flex-1">{item.name}</span>
                    {item.children.length > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                        {item.children.length}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

// ─── Tree Dialog ───────────────────────────────
function TreeNodeIcon({ hasChildren, expanded, selected }: { hasChildren: boolean; expanded: boolean; selected: boolean }) {
  if (hasChildren) {
    return expanded
      ? <FolderOpen className="h-4 w-4 text-primary/70 shrink-0" />
      : <Folder className="h-4 w-4 text-primary/70 shrink-0" />;
  }
  return (
    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0 flex items-center justify-center">
      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
    </div>
  );
}

function TreeNodeChildren({ node, selectedId, onSelect, depth, expanded }: {
  node: CatNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
  expanded: boolean;
}) {
  if (!expanded || node.children.length === 0) return null;
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 border-l border-border/30" style={{ marginLeft: `${depth * 20 + 18}px` }} />
      {node.children.map(child => (
        <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: CatNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}

function TreeNode({ node, selectedId, onSelect, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(
    () => {
      if (node.id === selectedId) return true;
      const checkDescendant = (n: CatNode): boolean =>
        n.id === selectedId || n.children.some(checkDescendant);
      return checkDescendant(node);
    }
  );

  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      {(<button
        type="button"
        className={cn(
          'flex items-center gap-2 w-full text-left py-1.5 px-2.5 rounded-md text-sm transition-all duration-150',
          'hover:bg-accent/50',
          isSelected && 'bg-primary/10 text-primary font-medium ring-1 ring-primary/20'
        )}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(prev => !prev);
        }}
      >
        {hasChildren ? (
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', expanded && 'rotate-90')} />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <TreeNodeIcon hasChildren={hasChildren} expanded={expanded} selected={isSelected} />
        <span className="truncate flex-1">{node.name}</span>
        {isSelected && hasChildren && <Check className="h-4 w-4 text-primary shrink-0" />}
      </button>)}
      <TreeNodeChildren node={node} selectedId={selectedId} onSelect={onSelect} depth={depth} expanded={expanded} />
    </div>
  );
}

function CategoryTreeDialog({
  roots,
  nodeMap,
  value,
  onChange,
}: {
  roots: CatNode[];
  nodeMap: Map<string, CatNode>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredRoots = useMemo(() => {
    if (!search) return roots;
    const q = search.toLowerCase();
    const matchIds = new Set<string>();
    for (const node of nodeMap.values()) {
      if (node.name.toLowerCase().includes(q)) {
        let current: CatNode | undefined = node;
        while (current) {
          matchIds.add(current.id);
          current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
        }
      }
    }
    if (matchIds.size === 0) return [];
    function filterNode(node: CatNode): CatNode | null {
      if (!matchIds.has(node.id)) return null;
      return { ...node, children: node.children.map(filterNode).filter(Boolean) as CatNode[] };
    }
    return roots.map(filterNode).filter(Boolean) as CatNode[];
  }, [roots, nodeMap, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0 rounded-lg border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
          <TreePine className="h-3.5 w-3.5" />
          Árvore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            Navegar por Árvore de Categorias
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
        </div>
        <ScrollArea className="h-[360px] -mx-2">
          <div className="px-2 py-1">
            {filteredRoots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tente outro termo de busca</p>
              </div>
            ) : (
              filteredRoots.map(root => (
                <TreeNode key={root.id} node={root} selectedId={value} onSelect={handleSelect} depth={0} />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────
export function CategoryCascadeSelector({ value, onChange, error }: CategoryCascadeSelectorProps) {
  const { data: categories = [], isLoading } = useExternalCategoriesQuery();

  const { roots, nodeMap } = useMemo(() => buildTree(categories), [categories]);

  const selectedNode = value ? nodeMap.get(value) : undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-9 bg-muted/20 rounded-lg animate-pulse" />
        <div className="h-5 w-48 bg-muted/15 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row: Cascade selects + Tree button + New */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <CascadeSelects roots={roots} nodeMap={nodeMap} value={value} onChange={onChange} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CategoryTreeDialog roots={roots} nodeMap={nodeMap} value={value} onChange={onChange} />
          <NewCategoryDialog onCreated={onChange} />
        </div>
      </div>

      {/* Breadcrumb - Elegant path display */}
      {selectedNode ? (
        <div className="flex items-center gap-0.5 flex-wrap bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
          <Layers className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
          {selectedNode.fullPath.map((segment, i) => {
            const isLast = i === selectedNode.fullPath.length - 1;
            return (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5" />}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-md transition-colors',
                  isLast
                    ? 'bg-primary/15 text-primary font-medium border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}>
                  {segment}
                </span>
              </span>
            );
          })}
          <button
            type="button"
            className="ml-2 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
            onClick={() => onChange('')}
            title="Limpar seleção"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
          </button>
        </div>
      ) : (
        /* Empty state */
        <div className="flex items-center gap-3 bg-muted/10 rounded-lg px-4 py-3 border border-dashed border-border/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/30">
            <FolderTree className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nenhuma categoria selecionada</p>
            <p className="text-[11px] text-muted-foreground/50">Selecione uma categoria acima ou navegue pela árvore</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
