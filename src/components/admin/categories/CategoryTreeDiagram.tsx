
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Pencil, Search, Maximize2, Minimize2, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface CategoryTreeDiagramProps<T extends TreeCategory> {
  categories: T[];
  onEdit: (category: T) => void;
}

type CategoryTreeNode<T extends TreeCategory> = T & { children: CategoryTreeNode<T>[] };

function buildCategoryTree<T extends TreeCategory>(categories: T[]): CategoryTreeNode<T>[] {
  const map: Record<string, CategoryTreeNode<T>> = {};
  const roots: CategoryTreeNode<T>[] = [];
  for (const category of categories) map[category.id] = { ...category, children: [] };
  for (const category of categories) {
    const node = map[category.id];
    if (!node) continue;
    const parent = category.parent_id ? map[category.parent_id] : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function filterCategoryNode<T extends TreeCategory>(node: CategoryTreeNode<T>, query: string): CategoryTreeNode<T> | null {
  const children = node.children.map(child => filterCategoryNode(child, query)).filter((child): child is CategoryTreeNode<T> => child !== null);
  return node.name.toLowerCase().includes(query) || children.length > 0 ? { ...node, children } : null;
}

function CategoryTreeNodeView<T extends TreeCategory>({ node, level, expandedIds, selectedNodeId, toggleExpand, selectNode, onEdit }: { node: CategoryTreeNode<T>; level: number; expandedIds: Set<string>; selectedNodeId: string | null; toggleExpand: (id: string) => void; selectNode: (id: string) => void; onEdit: (node: T) => void }) {
  const expanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const handleKeyDown = (event: React.KeyboardEvent) => { if (event.key === 'Enter') onEdit(node); if (event.key === ' ') { event.preventDefault(); toggleExpand(node.id); } };
  return <div className="select-none"><div className={cn("flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer", level > 0 && "ml-6 border-l pl-4", selectedNodeId === node.id && "bg-primary/5 ring-1 ring-primary/20")} onClick={() => selectNode(node.id)} onDoubleClick={() => onEdit(node)} role="button" tabIndex={0} onKeyDown={handleKeyDown}>{hasChildren ? <button onClick={event => { event.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 hover:bg-muted rounded text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <div className="w-5" />}<div className="flex items-center gap-2 flex-1">{hasChildren ? (expanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />) : <div className="h-4 w-4 border-2 border-primary/20 rounded-full" />}<span className="text-sm font-medium">{node.name}</span><span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{node.slug}</span></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={event => { event.stopPropagation(); onEdit(node); }} title="Editar categoria (Atalho: Enter)"><Pencil className="h-3.5 w-3.5" /></Button></div></div>{hasChildren && expanded && <div className="mt-1">{node.children.map(child => <CategoryTreeNodeView key={child.id} node={child} level={level + 1} expandedIds={expandedIds} selectedNodeId={selectedNodeId} toggleExpand={toggleExpand} selectNode={selectNode} onEdit={onEdit} />)}</div>}</div>;
}

function TreeDiagramCard<T extends TreeCategory>({ breadcrumbs, selectedNodeId, selectNode, searchTerm, setSearchTerm, roots, expandedIds, toggleExpand, expandAll, collapseAll, onEdit }: { breadcrumbs: T[]; selectedNodeId: string | null; selectNode: (id: string) => void; searchTerm: string; setSearchTerm: (value: string) => void; roots: CategoryTreeNode<T>[]; expandedIds: Set<string>; toggleExpand: (id: string) => void; expandAll: () => void; collapseAll: () => void; onEdit: (node: T) => void }) {
  return <Card><CardHeader className="pb-4"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><CardTitle className="text-lg flex items-center gap-2">Visualização Hierárquica</CardTitle><CardDescription>Estrutura de árvore das categorias e subcategorias</CardDescription></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5 h-8"><Maximize2 className="h-3.5 w-3.5" /> Expandir Tudo</Button><Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5 h-8"><Minimize2 className="h-3.5 w-3.5" /> Recolher Tudo</Button></div></div></CardHeader><CardContent className="space-y-4">{selectedNodeId && breadcrumbs.length > 0 && <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-dashed">{breadcrumbs.map((crumb, index) => <React.Fragment key={crumb.id}><span className="hover:text-primary cursor-pointer transition-colors font-medium" onClick={() => selectNode(crumb.id)}>{crumb.name}</span>{index < breadcrumbs.length - 1 && <ChevronRightIcon className="h-3 w-3 opacity-50" />}</React.Fragment>)}</div>}<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Filtrar árvore..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="pl-9 h-9" /></div><div className="border rounded-lg p-4 bg-muted/5 min-h-[300px]">{roots.length > 0 ? roots.map(root => <CategoryTreeNodeView key={root.id} node={root} level={0} expandedIds={expandedIds} selectedNodeId={selectedNodeId} toggleExpand={toggleExpand} selectNode={selectNode} onEdit={onEdit} />) : <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2"><Folder className="h-8 w-8 opacity-20" /><p className="text-sm">Nenhuma categoria encontrada</p></div>}</div></CardContent></Card>;
}

export function CategoryTreeDiagram<T extends TreeCategory>({ categories, onEdit }: CategoryTreeDiagramProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const breadcrumbs = useMemo(() => {
    if (!selectedNodeId) return [];

    const path: T[] = [];
    let current = categories.find(c => c.id === selectedNodeId);
    
    while (current) {
      path.unshift(current);
      const parentId = current.parent_id;
      current = categories.find(c => c.id === parentId);
    }
    
    return path;
  }, [selectedNodeId, categories]);


  const treeData = useMemo(() => buildCategoryTree(categories), [categories]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const expandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const query = searchTerm.toLowerCase();
  const filteredTree = useMemo(() => query ? treeData.map(node => filterCategoryNode(node, query)).filter((node): node is CategoryTreeNode<T> => node !== null) : treeData, [treeData, query]);

  return <TreeDiagramCard breadcrumbs={breadcrumbs} selectedNodeId={selectedNodeId} selectNode={setSelectedNodeId} searchTerm={searchTerm} setSearchTerm={setSearchTerm} roots={filteredTree} expandedIds={expandedIds} toggleExpand={toggleExpand} expandAll={expandAll} collapseAll={collapseAll} onEdit={onEdit} />;
}
