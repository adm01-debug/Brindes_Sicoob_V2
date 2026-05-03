
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Pencil, Search, Maximize2, Minimize2, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  [key: string]: any;
}

interface CategoryTreeDiagramProps {
  categories: Category[];
  onEdit: (category: Category) => void;
}

export function CategoryTreeDiagram({ categories, onEdit }: CategoryTreeDiagramProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const breadcrumbs = useMemo(() => {
    if (!selectedNodeId) return [];
    
    const path: Category[] = [];
    let current = categories.find(c => c.id === selectedNodeId);
    
    while (current) {
      path.unshift(current);
      const parentId = current.parent_id;
      current = categories.find(c => c.id === parentId);
    }
    
    return path;
  }, [selectedNodeId, categories]);


  const treeData = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];

    categories.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    });

    return roots;
  }, [categories]);

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

  const filteredTree = useMemo(() => {
    if (!searchTerm) return treeData;

    const filterNode = (node: any): any => {
      const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredChildren = node.children.map(filterNode).filter(Boolean);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return treeData.map(filterNode).filter(Boolean);
  }, [treeData, searchTerm]);

  const renderNode = (node: any, level = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group",
            level > 0 && "ml-6 border-l pl-4"
          )}
        >
          {hasChildren ? (
            <button 
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-muted rounded text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />
            ) : (
              <div className="h-4 w-4 border-2 border-primary/20 rounded-full" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
              {node.slug}
            </span>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Visualização Hierárquica
            </CardTitle>
            <CardDescription>Estrutura de árvore das categorias e subcategorias</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5 h-8">
              <Maximize2 className="h-3.5 w-3.5" /> Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5 h-8">
              <Minimize2 className="h-3.5 w-3.5" /> Recolher Tudo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar árvore..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="border rounded-lg p-4 bg-muted/5 min-h-[300px]">
          {filteredTree.length > 0 ? (
            filteredTree.map(root => renderNode(root))
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Folder className="h-8 w-8 opacity-20" />
              <p className="text-sm">Nenhuma categoria encontrada</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
