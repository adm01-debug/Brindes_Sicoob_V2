/**
 * MockupHistoryPanel — History grid with filters and pagination
 * Refatorado: Lightbox extraído para MockupLightbox.tsx
 */

/**
 * MockupHistoryPanel — History grid with filters and pagination
 * Refatorado: Lightbox extraído para MockupLightbox.tsx
 */
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  History, Download, RotateCcw, Trash2, Clock, Search, RefreshCw, Wand2,
  ChevronLeft, ChevronRight, Calendar, Columns2, X, Ruler, MapPin, Palette, FileImage,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MockupHistorySkeleton } from "./MockupSkeleton";
import { MockupCompareDialog } from "./MockupCompareDialog";
import { MockupLightbox } from "./MockupLightbox";
import { ShareMenu } from "./ShareMenu";

import type { GeneratedMockup } from "@/hooks/mockup/mockupGenerationService";

interface Technique { id: string; name: string; code: string | null; }
interface Client { id: string; name: string; }

interface MockupHistoryPanelProps {
  mockupHistory: GeneratedMockup[];
  isLoading: boolean;
  clients: Client[];
  techniques: Technique[];
  onLoadFromHistory: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
  onShare?: (mockup: GeneratedMockup) => void;
}

const ITEMS_PER_PAGE = 12;

interface HistoryFilters {
  client: string;
  product: string;
  technique: string;
  dateRange: string;
}

function matchesClient(mockup: GeneratedMockup, client: string): boolean {
  const hasClient = Boolean(mockup.client_id || mockup.client_name);
  if (client === "none") return !hasClient;
  if (client === "all") return true;
  return mockup.client_id === client || mockup.client_name === client;
}

function matchesProduct(mockup: GeneratedMockup, query: string): boolean {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return mockup.product_name.toLowerCase().includes(normalized) || Boolean(mockup.product_sku?.toLowerCase().includes(normalized));
}

function matchesTechnique(mockup: GeneratedMockup, technique: string, options: Array<Pick<Technique, "id" | "name">>): boolean {
  if (technique === "all") return true;
  const selected = options.find((item) => item.id === technique);
  return !selected || mockup.technique_name === selected.name;
}

function matchesDateRange(mockup: GeneratedMockup, dateRange: string): boolean {
  if (dateRange === "all") return true;
  const diffDays = (Date.now() - new Date(mockup.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const limits: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  return diffDays <= (limits[dateRange] ?? Number.POSITIVE_INFINITY);
}

function filterHistory(mockups: GeneratedMockup[], filters: HistoryFilters, techniques: Array<Pick<Technique, "id" | "name">>): GeneratedMockup[] {
  return mockups.filter((mockup) =>
    matchesClient(mockup, filters.client) &&
    matchesProduct(mockup, filters.product) &&
    matchesTechnique(mockup, filters.technique, techniques) &&
    matchesDateRange(mockup, filters.dateRange));
}

function visiblePageNumber(index: number, currentPage: number, totalPages: number): number {
  if (totalPages <= 5 || currentPage <= 3) return index + 1;
  if (currentPage >= totalPages - 2) return totalPages - 4 + index;
  return currentPage - 2 + index;
}

function CompareControls({ count, onCompare, onClear }: { count: number; onCompare: () => void; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <>
      <Badge variant="secondary">{count} selecionados</Badge>
      <Button size="sm" onClick={onCompare} disabled={count < 2}><Columns2 className="h-4 w-4 mr-1" /> Comparar</Button>
      <Button size="sm" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>
    </>
  );
}

function ClearFiltersButton({ visible, onClear }: { visible: boolean; onClear: () => void }) {
  if (!visible) return null;
  return <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={onClear}><RefreshCw className="h-4 w-4 mr-1" /> Limpar filtros</Button></div>;
}

export function MockupHistoryPanel({
  mockupHistory, isLoading, clients, techniques,
  onLoadFromHistory, onDownload, onDelete,
}: MockupHistoryPanelProps) {
  const [filterClient, setFilterClient] = useState("all");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterTechnique, setFilterTechnique] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(() => getDefaultColumns());
  const [lightboxMockup, setLightboxMockup] = useState<GeneratedMockup | null>(null);

  const handleSetViewMode = (mode: "grid" | "list" | "table") => { setViewMode(mode as "grid" | "list"); setCurrentPage(1); };
  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const compareMockups = mockupHistory.filter(m => selectedForCompare.has(m.id));

  const historyTechniques = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of mockupHistory) {
      if (m.technique_name) {
        const tech = techniques.find(t => t.name === m.technique_name);
        map.set(m.technique_name, tech?.id || m.technique_name);
      }
    }
    return Array.from(map.entries()).map(([name, id]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [mockupHistory, techniques]);

  const filteredMockups = useMemo(() => {
    return filterHistory(mockupHistory, {
      client: filterClient,
      product: filterProduct,
      technique: filterTechnique,
      dateRange: filterDateRange,
    }, historyTechniques);
  }, [mockupHistory, filterClient, filterProduct, filterTechnique, filterDateRange, historyTechniques]);

  const totalPages = Math.ceil(filteredMockups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMockups = filteredMockups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const hasFilters = filterClient !== "all" || filterProduct || filterTechnique !== "all" || filterDateRange !== "all";

  const clearFilters = () => { setFilterClient("all"); setFilterProduct(""); setFilterTechnique("all"); setFilterDateRange("all"); setCurrentPage(1); };

  return (
    <Card className="border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Histórico de Mockups</CardTitle>
            <CardDescription>Mockups gerados anteriormente</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <CompareControls count={selectedForCompare.size} onCompare={() => setShowCompare(true)} onClear={() => setSelectedForCompare(new Set())} />
            <LayoutPopover viewMode={viewMode} setViewMode={handleSetViewMode} gridColumns={gridColumns} setGridColumns={setGridColumns} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select value={filterClient} onValueChange={(v) => { setFilterClient(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <Input placeholder="Buscar por nome ou SKU..." value={filterProduct}
              onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Técnica</Label>
            <Select value={filterTechnique} onValueChange={(v) => { setFilterTechnique(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as técnicas</SelectItem>
                {historyTechniques.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Período</Label>
            <Select value={filterDateRange} onValueChange={(v) => { setFilterDateRange(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todo período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ClearFiltersButton visible={Boolean(hasFilters)} onClear={clearFilters} />

        {/* Content */}
        {isLoading ? <MockupHistorySkeleton count={8} />
          : mockupHistory.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Wand2 className="h-10 w-10 text-primary/60" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Nenhum mockup gerado ainda</h3>
              <p className="text-muted-foreground max-w-md mx-auto">Comece criando seu primeiro mockup!</p>
            </div>
          ) : filteredMockups.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">Nenhum resultado</h3>
              <p className="text-muted-foreground mb-4">Ajuste os filtros de busca.</p>
              <Button variant="outline" size="sm" onClick={clearFilters}><RefreshCw className="h-4 w-4 mr-2" /> Limpar filtros</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredMockups.length)} de {filteredMockups.length}</span>
                {totalPages > 1 && <span>Página {currentPage} de {totalPages}</span>}
              </div>

              {viewMode === "grid" ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
                  {paginatedMockups.map((mockup) => (
                    <MockupGridCard key={mockup.id} mockup={mockup} isCompareSelected={selectedForCompare.has(mockup.id)}
                      onToggleCompare={toggleCompareSelection} onOpenLightbox={setLightboxMockup}
                      onLoadFromHistory={onLoadFromHistory} onDownload={onDownload} onDelete={onDelete} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedMockups.map((mockup) => (
                    <MockupListRow key={mockup.id} mockup={mockup} isCompareSelected={selectedForCompare.has(mockup.id)}
                      onToggleCompare={toggleCompareSelection} onLoadFromHistory={onLoadFromHistory}
                      onDownload={onDownload} onDelete={onDelete} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>Primeira</Button>
                  <Button variant="outline" size="icon" aria-label="Voltar" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = visiblePageNumber(i, currentPage, totalPages);
                      return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>;
                    })}
                  </div>
                  <Button variant="outline" size="icon" aria-label="Avançar" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Última</Button>
                </div>
              )}
            </div>
          )}
      </CardContent>

      <MockupCompareDialog open={showCompare} onOpenChange={setShowCompare} mockups={compareMockups} onDownload={onDownload} />
      <MockupLightbox mockup={lightboxMockup} onClose={() => setLightboxMockup(null)} onLoadFromHistory={onLoadFromHistory} onDownload={onDownload} />
    </Card>
  );
}

// ============================================
// Sub-components (inlined — small enough)
// ============================================

function CompareMarker({ selected, mockupId, onToggle, compact = false }: {
  selected: boolean;
  mockupId: string;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  const size = compact ? "w-5 h-5" : "w-6 h-6";
  const visibility = compact ? "" : "opacity-0 group-hover:opacity-100";
  return (
    <div className={cn("flex items-center justify-center rounded border-2 cursor-pointer transition-all", size,
      selected ? "border-primary bg-primary text-primary-foreground" : `border-muted-foreground/30 ${visibility}`)}
      onClick={(event) => { event.stopPropagation(); onToggle(mockupId); }}>
      {selected && <span className={compact ? "text-[10px] font-bold" : "text-xs font-bold"}>✓</span>}
    </div>
  );
}

function MockupDimensions({ mockup }: { mockup: GeneratedMockup }) {
  if (!mockup.logo_width_cm && !mockup.logo_height_cm) return null;
  return (
    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
      <Ruler className="h-2.5 w-2.5" />{mockup.logo_width_cm?.toFixed(1)}×{mockup.logo_height_cm?.toFixed(1)} cm
    </span>
  );
}

function MockupColorCount({ count }: { count: number | null | undefined }) {
  if (!count) return null;
  return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Palette className="h-2.5 w-2.5" />{count} cor{count > 1 ? "es" : ""}</span>;
}

function MockupBadges({ mockup }: { mockup: GeneratedMockup }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{mockup.technique_name}</Badge>
      {mockup.location_name && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5"><MapPin className="h-2.5 w-2.5" />{mockup.location_name}</Badge>}
      <MockupDimensions mockup={mockup} />
      <MockupColorCount count={mockup.colors_count} />
    </div>
  );
}

function MockupAge({ createdAt }: { createdAt: string }) {
  return <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}</span>;
}

function MockupActions({ mockup, onLoadFromHistory, onDownload, onDelete, shadow = false }: {
  mockup: GeneratedMockup;
  onLoadFromHistory: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
  shadow?: boolean;
}) {
  const className = cn("h-8 w-8", shadow && "shadow-md");
  const downloadUrl = mockup.layout_url || mockup.mockup_url;
  return (
    <>
      <Tooltip><TooltipTrigger asChild><Button size="icon" aria-label="Regenerar" variant="secondary" className={className} onClick={() => onLoadFromHistory(mockup)}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Regenerar</TooltipContent></Tooltip>
      <ShareMenu mockupUrl={mockup.mockup_url} productName={mockup.product_name} techniqueName={mockup.technique_name} className={cn(className, "p-0 [&>svg]:h-4 [&>svg]:w-4")} />
      <Tooltip><TooltipTrigger asChild><Button size="icon" aria-label="Download" variant="secondary" className={className} onClick={() => onDownload(downloadUrl)}><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Baixar</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button size="icon" aria-label="Excluir" variant="destructive" className={className} onClick={() => onDelete(mockup.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
    </>
  );
}

function MockupGridDetails({ mockup }: { mockup: GeneratedMockup }) {
  return (
    <div className="p-3 space-y-1.5 border-t bg-gradient-to-t from-muted/50 to-transparent">
      <Tooltip><TooltipTrigger asChild><span className="font-medium text-sm truncate cursor-default block">{mockup.product_name}</span></TooltipTrigger>
        <TooltipContent><p>{mockup.product_name}</p>{mockup.product_sku && <p className="text-xs text-muted-foreground">SKU: {mockup.product_sku}</p>}</TooltipContent></Tooltip>
      {mockup.product_sku && <span className="text-[10px] text-muted-foreground font-mono">{mockup.product_sku}</span>}
      <MockupBadges mockup={mockup} />
      {mockup.client_name && <p className="text-xs text-primary truncate font-medium">👤 {mockup.client_name}</p>}
      <div className="flex items-center gap-1 text-xs text-muted-foreground"><MockupAge createdAt={mockup.created_at} /></div>
    </div>
  );
}

function MockupGridImage({ mockup, onOpen }: { mockup: GeneratedMockup; onOpen: (mockup: GeneratedMockup) => void }) {
  const open = () => onOpen(mockup);
  return (
    <div className="aspect-[3/4] bg-muted/30 overflow-hidden cursor-pointer" role="button" tabIndex={0} onClick={open}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }} aria-label={`Abrir mockup de ${mockup.product_name}`}>
      <img src={mockup.layout_url || mockup.mockup_url} alt={`Mockup de ${mockup.product_name}`}
        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      {mockup.layout_url && <div className="absolute bottom-1 left-1"><Badge variant="secondary" className="text-[9px] px-1 py-0 bg-background/80 backdrop-blur-sm"><FileImage className="h-2.5 w-2.5 mr-0.5" />Layout</Badge></div>}
    </div>
  );
}

function MockupGridCard({ mockup, isCompareSelected, onToggleCompare, onOpenLightbox, onLoadFromHistory, onDownload, onDelete }: {
  mockup: GeneratedMockup; isCompareSelected: boolean;
  onToggleCompare: (id: string) => void; onOpenLightbox: (m: GeneratedMockup) => void;
  onLoadFromHistory: (m: GeneratedMockup) => void; onDownload: (url: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className={cn("group relative border border-border/30 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/30 hover:shadow-lg transition-all duration-300 bg-card",
      isCompareSelected && "ring-2 ring-primary shadow-lg")}>
      <div className="absolute top-2 left-2 z-10"><CompareMarker selected={isCompareSelected} mockupId={mockup.id} onToggle={onToggleCompare} /></div>
      <MockupGridImage mockup={mockup} onOpen={onOpenLightbox} />
      <MockupGridDetails mockup={mockup} />
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
        <MockupActions mockup={mockup} onLoadFromHistory={onLoadFromHistory} onDownload={onDownload} onDelete={onDelete} shadow />
      </div>
    </div>
  );
}

function MockupListRow({ mockup, isCompareSelected, onToggleCompare, onLoadFromHistory, onDownload, onDelete }: {
  mockup: GeneratedMockup; isCompareSelected: boolean;
  onToggleCompare: (id: string) => void; onLoadFromHistory: (m: GeneratedMockup) => void;
  onDownload: (url: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className={cn("group flex items-center gap-4 p-3 border border-border/30 rounded-lg hover:ring-2 hover:ring-primary/30 hover:shadow-md transition-all duration-200 bg-card",
      isCompareSelected && "ring-2 ring-primary shadow-lg")}>
      <CompareMarker selected={isCompareSelected} mockupId={mockup.id} onToggle={onToggleCompare} compact />
      <div className="flex-shrink-0 w-16 h-20 rounded-md bg-muted/30 overflow-hidden border">
        <img src={mockup.layout_url || mockup.mockup_url} alt={mockup.product_name} className="w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {mockup.client_name && <p className="text-sm text-primary font-semibold truncate">👤 {mockup.client_name}</p>}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{mockup.product_name}</span>
          {mockup.product_sku && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">{mockup.product_sku}</Badge>}
        </div>
        <MockupBadges mockup={mockup} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <MockupAge createdAt={mockup.created_at} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <MockupActions mockup={mockup} onLoadFromHistory={onLoadFromHistory} onDownload={onDownload} onDelete={onDelete} />
      </div>
    </div>
  );
}
