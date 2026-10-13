/**
 * QuotesConfigurableList - Lista de orçamentos com colunas reordenáveis, paginação e seleção em massa
 */

import { useState, useMemo, useCallback } from "react";
import { renderQuoteCell } from "./QuoteListCellRenderer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  Edit,
  Settings2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
} from "lucide-react";
import type { Quote } from "@/hooks/quotes/useQuotes";
import { BulkActionsBar } from "@/components/common/BulkActionsBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useQuoteViewedMap } from "@/hooks/useQuoteViewedMap";
import { QuoteViewedBadge } from "./QuoteViewedBadge";
import { QuoteRowQuickActions } from "./QuoteRowQuickActions";
import { QuoteOrderBadge } from "./QuoteOrderBadge";
import { isQuoteCommerciallyEditable } from "@/lib/quote-status-config";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Column definitions ──
export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  align?: "left" | "right" | "center";
  required?: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "status", label: "Status", width: "110px" },
  { id: "client", label: "Empresa", width: "minmax(120px, 0.7fr)", required: true },
  { id: "contact", label: "Contato", width: "120px" },
  { id: "date", label: "Data", width: "110px" },
  { id: "value", label: "Valor", width: "140px", align: "right" },
  { id: "delivery", label: "Entrega", width: "150px" },
  { id: "quote_number", label: "Nº Orçamento", width: "200px" },
];

// ── Sortable Header Cell ──
function SortableHeaderCell({ column }: { column: ColumnDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 select-none cursor-grab active:cursor-grabbing ${
        column.align === "right" ? "justify-end" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
      <span>{column.label}</span>
    </div>
  );
}

// ── Props ──
interface QuotesConfigurableListProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onBulkExport?: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onMarkApproved?: (id: string) => void;
  isSupervisor?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
type QuoteWithId = Quote & { id: string };

function hasQuoteId(quote: Quote): quote is QuoteWithId {
  return typeof quote.id === "string" && quote.id.length > 0;
}

function useQuotePagination(quotes: Quote[]) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalPages = Math.max(1, Math.ceil(quotes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageQuotes = useMemo(() => quotes.slice((safePage - 1) * pageSize, safePage * pageSize)
    .filter(hasQuoteId), [quotes, safePage, pageSize]);
  const changeSize = (value: string, clear: () => void) => {
    setPageSize(Number(value)); setCurrentPage(1); clear();
  };
  return { currentPage, setCurrentPage, pageSize, totalPages, safePage, pageQuotes, changeSize };
}

function useQuoteColumns() {
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map((column) => column.id));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const visibleColumns = useMemo(() => columnOrder.filter((id) => !hiddenColumns.has(id)).flatMap((id) => {
    const column = ALL_COLUMNS.find((candidate) => candidate.id === id);
    return column ? [column] : [];
  }), [columnOrder, hiddenColumns]);
  const gridTemplate = useMemo(() => ["40px", ...visibleColumns.map((column) => column.width), "180px"].join(" "), [visibleColumns]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dragEnd = useCallback((event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    setColumnOrder((previous) => arrayMove(previous, previous.indexOf(event.active.id as string), previous.indexOf(event.over?.id as string)));
  }, []);
  const toggle = useCallback((id: string) => setHiddenColumns((previous) => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  }), []);
  return { hiddenColumns, visibleColumns, gridTemplate, sensors, dragEnd, toggle };
}

function useListSelection(pageQuotes: QuoteWithId[], quotes: Quote[]) {
  const bulk = useBulkSelection(pageQuotes);
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const clear = () => { bulk.clearSelection(); setAllPagesSelected(false); };
  const toggleAll = () => { setAllPagesSelected(false); bulk.toggleAll(); };
  const selectedIds = allPagesSelected ? quotes.filter(hasQuoteId).map((quote) => quote.id) : bulk.selectedIds;
  return { ...bulk, allPagesSelected, setAllPagesSelected, clear, toggleAll, selectedIds,
    selectedCount: allPagesSelected ? quotes.length : bulk.selectedCount,
    showSelectAllBanner: bulk.isAllSelected && quotes.length > 0 && !allPagesSelected };
}

type Pagination = ReturnType<typeof useQuotePagination>;
type Columns = ReturnType<typeof useQuoteColumns>;
type Selection = ReturnType<typeof useListSelection>;

function QuoteBulkBar({ props, selection }: { props: QuotesConfigurableListProps; selection: Selection }) {
  const selectedQuotes = props.quotes.filter(hasQuoteId).filter((quote) => selection.selectedIds.includes(quote.id));
  const hasProtectedQuote = selectedQuotes.some((quote) => !isQuoteCommerciallyEditable(quote.status, quote.is_latest_version));
  const actions = [
    ...(props.onBulkStatusChange ? [{ id: "mark-pending", label: "Marcar Pendente", icon: <RefreshCw className="h-3.5 w-3.5" />,
      variant: "outline" as const, onClick: (ids: string[]) => { props.onBulkStatusChange?.(ids, "pending"); selection.clear(); } }] : []),
    ...(props.onBulkExport ? [{ id: "export", label: "Exportar", icon: <Download className="h-3.5 w-3.5" />,
      variant: "outline" as const, onClick: (ids: string[]) => props.onBulkExport?.(ids) }] : []),
    { id: "delete", label: "Excluir editáveis", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive" as const,
      onClick: (ids: string[]) => { if (props.isSupervisor && !hasProtectedQuote) { props.onBulkDelete([...ids]); selection.clear(); } },
      disabled: !props.isSupervisor || hasProtectedQuote },
  ];
  return <BulkActionsBar selectedCount={selection.selectedCount} selectedIds={selection.selectedIds} entityLabel="orçamento"
    onClear={selection.clear} showSelectAllBanner={selection.showSelectAllBanner} totalCount={props.quotes.length}
    onSelectAll={() => selection.setAllPagesSelected(true)} actions={actions} />;
}

function ColumnSettings({ columns }: { columns: Columns }) {
  return <div className="flex justify-end"><Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
    <Settings2 className="h-3.5 w-3.5" />Colunas</Button></PopoverTrigger><PopoverContent align="end" className="w-56 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">Exibir colunas</p><div className="space-y-2">
      {ALL_COLUMNS.map((column) => <label key={column.id} className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={!columns.hiddenColumns.has(column.id)} onCheckedChange={() => columns.toggle(column.id)} disabled={column.required} />
        <span className={column.required ? "text-muted-foreground" : ""}>{column.label}</span></label>)}
    </div><p className="text-[10px] text-muted-foreground mt-3">Arraste os cabeçalhos para reordenar</p>
  </PopoverContent></Popover></div>;
}

function TableHeader({ columns, selection }: { columns: Columns; selection: Selection }) {
  return <DndContext sensors={columns.sensors} collisionDetection={closestCenter} onDragEnd={columns.dragEnd}>
    <div className="grid gap-4 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold border-b border-primary/80 sticky top-0 z-10"
      style={{ gridTemplateColumns: columns.gridTemplate }}><div className="flex items-center justify-center"><Checkbox
        checked={selection.isAllSelected} onCheckedChange={selection.toggleAll}
        className="border-primary-foreground/50 data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" /></div>
      <SortableContext items={columns.visibleColumns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
        {columns.visibleColumns.map((column) => <SortableHeaderCell key={column.id} column={column} />)}
      </SortableContext><span /></div>
  </DndContext>;
}

function QuoteRow({ quote, props, columns, selection, viewed, navigate }: {
  quote: QuoteWithId; props: QuotesConfigurableListProps; columns: Columns; selection: Selection;
  viewed: ReturnType<typeof useQuoteViewedMap>[string] | undefined; navigate: ReturnType<typeof useNavigate>;
}) {
  const selected = selection.isSelected(quote.id) || selection.allPagesSelected;
  const toggle = () => {
    if (selection.allPagesSelected) { selection.setAllPagesSelected(false); selection.toggleAll(); }
    selection.toggleItem(quote.id);
  };
  return <div className={`group grid gap-4 px-4 py-3 items-center border-b border-border/40 cursor-pointer transition-all duration-150 hover:bg-muted/40 hover:border-l-2 hover:border-l-primary/60 ${selected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
    style={{ gridTemplateColumns: columns.gridTemplate }} onClick={() => navigate(`/orcamentos/${quote.id}`)}>
    <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected} onCheckedChange={toggle} /></div>
    {columns.visibleColumns.map((column) => <div key={column.id} className={`min-w-0 ${column.align === "right" ? "text-right" : ""}`}>
      {column.id === "client" ? <div className="flex items-center gap-2 min-w-0"><div className="min-w-0 flex-1">{renderQuoteCell(quote, column.id, navigate)}</div>
        {viewed && <QuoteViewedBadge info={viewed} />}<QuoteOrderBadge quoteId={quote.id} /></div> : renderQuoteCell(quote, column.id, navigate)}
    </div>)}<div className="flex items-center justify-end gap-0.5"><QuoteRowQuickActions quote={quote} isSupervisor={props.isSupervisor}
      onDuplicate={props.onDuplicate} onMarkApproved={(id) => props.onMarkApproved?.(id)} /><RowMenu quote={quote} props={props} navigate={navigate} /></div>
  </div>;
}

function RowMenu({ quote, props, navigate }: { quote: QuoteWithId; props: QuotesConfigurableListProps; navigate: ReturnType<typeof useNavigate> }) {
  const editable = isQuoteCommerciallyEditable(quote.status, quote.is_latest_version);
  return <DropdownMenu><DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mais opções">
    <MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
    <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}`)}><Eye className="h-4 w-4 mr-2" /> Visualizar</DropdownMenuItem>
    <DropdownMenuItem disabled={!editable} onClick={() => editable && navigate(`/orcamentos/${quote.id}/editar`)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
    <DropdownMenuItem onClick={() => props.onDuplicate(quote.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem><DropdownMenuSeparator />
    <DropdownMenuItem disabled={!props.isSupervisor || !editable} className="text-destructive"
      onClick={() => props.isSupervisor && editable && props.onDelete(quote.id)}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}

function PaginationFooter({ pagination, total, clear }: { pagination: Pagination; total: number; clear: () => void }) {
  const { pageSize, safePage, totalPages, setCurrentPage } = pagination;
  return <div className="flex items-center justify-between px-2 py-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Exibindo</span>
    <Select value={String(pageSize)} onValueChange={(value) => pagination.changeSize(value, clear)}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
      <SelectContent>{PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select>
    <span>de {total} resultado(s)</span></div><div className="flex items-center gap-1"><span className="text-sm text-muted-foreground mr-2">Página {safePage} de {totalPages}</span>
      <Button variant="outline" size="icon" aria-label="ChevronsLeft" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" aria-label="Voltar" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" aria-label="Avançar" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" aria-label="ChevronsRight" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
    </div></div>;
}

export function QuotesConfigurableList(props: QuotesConfigurableListProps) {
  const navigate = useNavigate();
  const pagination = useQuotePagination(props.quotes);
  const columns = useQuoteColumns();
  const selection = useListSelection(pagination.pageQuotes, props.quotes);
  const visibleIds = useMemo(() => pagination.pageQuotes.map((quote) => quote.id), [pagination.pageQuotes]);
  const viewedMap = useQuoteViewedMap(visibleIds);
  return <div className="space-y-2">
    <QuoteBulkBar props={props} selection={selection} />
    <ColumnSettings columns={columns} />
    <div className="rounded-lg border border-border overflow-x-hidden overflow-y-auto max-h-[calc(100vh-420px)] pb-16">
      <TableHeader columns={columns} selection={selection} />
      {pagination.pageQuotes.map((quote) => <QuoteRow key={quote.id} quote={quote} props={props} columns={columns}
        selection={selection} viewed={viewedMap[quote.id]} navigate={navigate} />)}
    </div>
    <PaginationFooter pagination={pagination} total={props.quotes.length} clear={selection.clear} />
  </div>;
}
