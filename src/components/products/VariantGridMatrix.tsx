/**
 * VariantGridMatrix — Grade visual Cor × Tamanho (refactored)
 * Helpers in ./variant-grid/
 */
import { useMemo, useState, useCallback } from "react";
import { Check, Package, Ruler, CheckSquare, Square, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BulkToolbar } from "./variant-grid/BulkToolbar";
import { getSizeOrder, isLightColor, formatStock, stockColor } from "./variant-grid/VariantGridHelpers";

export interface VariantGridItem {
  id: string; color_name: string; color_hex: string; size_code?: string | null;
  stock: number; sku?: string; image?: string | null; price?: number | null;
}

export interface BulkAction { type: "toggle_active" | "update_stock"; variantIds: string[]; value?: boolean | number; }

interface VariantGridMatrixProps {
  variants: VariantGridItem[]; selectedId?: string | null; onSelect?: (variant: VariantGridItem) => void;
  mode?: "view" | "admin"; compact?: boolean; onBulkAction?: (action: BulkAction) => Promise<void>; isBulkLoading?: boolean;
}

type VariantColor = { name: string; hex: string };
type VariantMatrix = Map<string, Map<string, VariantGridItem>>;
type GridModel = { colors: VariantColor[]; sizes: string[]; matrix: VariantMatrix; hasSizes: boolean; allVariantIds: string[] };
type GridSelection = ReturnType<typeof useVariantSelection>;

const NONE_SIZE = "__none__";
const CELL_COMPACT = "px-2 py-1.5";
const CELL_REGULAR = "px-3 py-2";
const COLOR_FALLBACK = "hsl(var(--muted))";
const ICON_PRIMARY = "h-3.5 w-3.5 text-primary mx-auto";
const ICON_MUTED = "h-3.5 w-3.5 text-muted-foreground mx-auto";
const SELECTED_ROW = "bg-primary/5";
const ADMIN_COMPACT = "px-1 py-1.5";
const LEFT_ADMIN = "left-8 z-10";
const LEFT_VIEW = "left-0 z-10";

function buildGridModel(variants: VariantGridItem[]): GridModel {
  const colorMap = new Map<string, VariantColor>();
  const sizeSet = new Set<string>();
  const matrix: VariantMatrix = new Map();
  for (const variant of variants) {
    colorMap.set(variant.color_name, colorMap.get(variant.color_name) ?? { name: variant.color_name, hex: variant.color_hex });
    if (variant.size_code) sizeSet.add(variant.size_code);
    const row = matrix.get(variant.color_name) ?? new Map<string, VariantGridItem>();
    row.set(variant.size_code || NONE_SIZE, variant);
    matrix.set(variant.color_name, row);
  }
  const sizes = Array.from(sizeSet).sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
  return {
    colors: Array.from(colorMap.values()), sizes, matrix,
    hasSizes: sizes.length > 0, allVariantIds: variants.map(variant => variant.id),
  };
}

function updateSelection(previous: Set<string>, ids: string[]) {
  const next = new Set(previous);
  const shouldRemove = ids.every(id => next.has(id));
  for (const id of ids) {
    if (shouldRemove) next.delete(id);
    else next.add(id);
  }
  return next;
}

function useVariantSelection(variants: VariantGridItem[], allVariantIds: string[], onBulkAction?: VariantGridMatrixProps["onBulkAction"]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelection = useCallback((id: string) => setSelectedIds(current => updateSelection(current, [id])), []);
  const selectAll = useCallback(() => setSelectedIds(new Set(allVariantIds)), [allVariantIds]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);
  const toggleRowSelection = useCallback((colorName: string) => {
    const rowIds = variants.filter(variant => variant.color_name === colorName).map(variant => variant.id);
    setSelectedIds(current => updateSelection(current, rowIds));
  }, [variants]);
  const runBulkAction = useCallback(async (type: BulkAction["type"], value: BulkAction["value"]) => {
    if (!onBulkAction || selectedIds.size === 0) return;
    await onBulkAction({ type, variantIds: Array.from(selectedIds), value });
    setSelectedIds(new Set());
  }, [onBulkAction, selectedIds]);
  const handleBulkToggle = useCallback((active: boolean) => runBulkAction("toggle_active", active), [runBulkAction]);
  const handleBulkStock = useCallback((stock: number) => runBulkAction("update_stock", stock), [runBulkAction]);
  return { selectedIds, toggleSelection, selectAll, deselectAll, toggleRowSelection, handleBulkToggle, handleBulkStock };
}

function BulkActions({ selection, model, loading }: { selection: GridSelection; model: GridModel; loading: boolean }) {
  if (selection.selectedIds.size === 0) return null;
  return <BulkToolbar selectedCount={selection.selectedIds.size} totalCount={model.allVariantIds.length}
    onSelectAll={selection.selectAll} onDeselectAll={selection.deselectAll} onToggleActive={selection.handleBulkToggle}
    onUpdateStock={selection.handleBulkStock} isLoading={loading} />;
}

function SelectionIcon({ selected }: { selected: boolean }) {
  return selected
    ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
    : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function ColorVariantButton({ color, variant, selectedId, isAdmin, selection, onSelect }: {
  color: VariantColor; variant: VariantGridItem; selectedId?: string | null; isAdmin: boolean;
  selection: GridSelection; onSelect?: VariantGridMatrixProps["onSelect"];
}) {
  const stock = Math.max(0, variant.stock);
  const isBulk = selection.selectedIds.has(variant.id);
  const visualState = isBulk ? "border-primary bg-primary/15 ring-2 ring-primary/30"
    : selectedId === variant.id ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40";
  const handleClick = () => isAdmin ? selection.toggleSelection(variant.id) : onSelect?.(variant);
  return <Tooltip><TooltipTrigger asChild>
    <button onClick={handleClick} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm", visualState, stock === 0 && "opacity-40")}>
      {isAdmin && <SelectionIcon selected={isBulk} />}
      <div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex || COLOR_FALLBACK }} />
      <span className="font-medium">{color.name}</span><span className={cn("text-xs font-mono", stockColor(stock))}>{formatStock(stock)}</span>
    </button></TooltipTrigger>
    <TooltipContent>{variant.sku && <p className="font-mono text-xs">{variant.sku}</p>}<p>{stock} un. em estoque</p>{isAdmin && <p className="text-xs text-muted-foreground">Clique para selecionar</p>}</TooltipContent>
  </Tooltip>;
}

function SingleAxisGrid({ model, selection, selectedId, isAdmin, onSelect }: {
  model: GridModel; selection: GridSelection; selectedId?: string | null; isAdmin: boolean; onSelect?: VariantGridMatrixProps["onSelect"];
}) {
  return <>
    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Variações de Cor ({model.colors.length})</h4>
    <div className="flex flex-wrap gap-2">{model.colors.map(color => {
      const variant = model.matrix.get(color.name)?.get(NONE_SIZE);
      return variant ? <ColorVariantButton key={variant.id} color={color} variant={variant} selectedId={selectedId} isAdmin={isAdmin} selection={selection} onSelect={onSelect} /> : null;
    })}</div>
  </>;
}

function GridHeader({ model, selection, isAdmin, compact }: { model: GridModel; selection: GridSelection; isAdmin: boolean; compact: boolean }) {
  const allSelected = selection.selectedIds.size === model.allVariantIds.length;
  const icon = allSelected ? <CheckSquare className={ICON_PRIMARY} />
    : selection.selectedIds.size > 0 ? <Minus className={ICON_PRIMARY} /> : <Square className={ICON_MUTED} />;
  return <thead><tr className="bg-muted/50">
    {isAdmin && <th className={cn("sticky left-0 z-20 bg-muted/80 backdrop-blur-sm text-center border-b border-r border-border w-8", compact ? ADMIN_COMPACT : "px-2 py-2")}>
      <button onClick={allSelected ? selection.deselectAll : selection.selectAll} className="hover:text-primary transition-colors" aria-label="Selecionar todos">{icon}</button></th>}
    <th className={cn("sticky bg-muted/80 backdrop-blur-sm text-left font-semibold text-muted-foreground border-b border-r border-border", isAdmin ? LEFT_ADMIN : LEFT_VIEW, compact ? CELL_COMPACT : CELL_REGULAR)}>Cor</th>
    {model.sizes.map(size => <th key={size} className={cn("text-center font-semibold text-muted-foreground border-b border-border whitespace-nowrap", compact ? CELL_COMPACT : CELL_REGULAR)}>{size}</th>)}
  </tr></thead>;
}

function variantCellVisualState(isBulk: boolean, isItem: boolean, stock: number) {
  if (isBulk) return "bg-primary/20 text-primary ring-2 ring-primary/40 shadow-sm";
  if (isItem) return "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm";
  return stock > 0 ? "bg-secondary/60 hover:bg-secondary text-foreground hover:shadow-sm" : "bg-destructive/5 text-destructive/60";
}

function VariantCellIcons({ isBulk, isItem }: { isBulk: boolean; isItem: boolean }) {
  if (isBulk) return <Check className="inline-block h-3 w-3 mr-0.5 -mt-0.5 text-primary" />;
  return isItem ? <Check className="inline-block h-3 w-3 mr-0.5 -mt-0.5" /> : null;
}

function VariantTooltip({ variant, color, size, stock }: { variant: VariantGridItem; color: VariantColor; size: string; stock: number }) {
  const stockLabel = stock > 0 ? `${stock.toLocaleString("pt-BR")} un. disponíveis` : "Sem estoque";
  return <TooltipContent side="top" className="text-xs"><div className="space-y-0.5">
    <p className="font-semibold">{color.name} — {size}</p>{variant.sku && <p className="font-mono text-muted-foreground">{variant.sku}</p>}
    {variant.price !== null && variant.price !== undefined && <p className="text-primary font-medium">R$ {variant.price.toFixed(2)}</p>}
    <p className={stockColor(stock)}>{stockLabel}</p>
  </div></TooltipContent>;
}

function VariantCell({ variant, color, size, selection, selectedId, isAdmin, compact, onSelect }: {
  variant?: VariantGridItem; color: VariantColor; size: string; selection: GridSelection; selectedId?: string | null;
  isAdmin: boolean; compact: boolean; onSelect?: VariantGridMatrixProps["onSelect"];
}) {
  if (!variant) return <td className={cn("text-center border-border", compact ? CELL_COMPACT : CELL_REGULAR)}><span className="text-muted-foreground/30">—</span></td>;
  const stock = Math.max(0, variant.stock);
  const isItem = selectedId === variant.id;
  const isBulk = selection.selectedIds.has(variant.id);
  const visualState = variantCellVisualState(isBulk, isItem, stock);
  const handleClick = () => isAdmin ? selection.toggleSelection(variant.id) : onSelect?.(variant);
  return <td className={cn("text-center border-border", compact ? "px-1 py-1" : "px-2 py-2")}>
    <Tooltip><TooltipTrigger asChild>
      <button onClick={handleClick} className={cn("w-full min-w-[3rem] py-1.5 px-2 rounded-md transition-all text-xs font-medium", visualState, (stock > 0 || isAdmin) && !isItem && "hover:scale-105")}>
        <VariantCellIcons isBulk={isBulk} isItem={isItem} />{formatStock(stock)}
      </button></TooltipTrigger>
      <VariantTooltip variant={variant} color={color} size={size} stock={stock} />
    </Tooltip></td>;
}

function rowSelectionIcon(allRow: boolean, someRow: boolean) {
  if (allRow) return <CheckSquare className={ICON_PRIMARY} />;
  if (someRow) return <Minus className={ICON_PRIMARY} />;
  return <Square className={ICON_MUTED} />;
}

function AdminRowSelector({ color, allRow, someRow, compact, background, selection }: {
  color: VariantColor; allRow: boolean; someRow: boolean; compact: boolean; background: string; selection: GridSelection;
}) {
  return <td className={cn("sticky left-0 z-10 text-center border-r border-border w-8", compact ? ADMIN_COMPACT : "px-2 py-2.5", background, someRow && SELECTED_ROW)}>
    <button onClick={() => selection.toggleRowSelection(color.name)} className="hover:text-primary transition-colors">{rowSelectionIcon(allRow, someRow)}</button>
  </td>;
}

function ColorLabel({ color, isAdmin, compact, background, selected }: {
  color: VariantColor; isAdmin: boolean; compact: boolean; background: string; selected: boolean;
}) {
  const border = isLightColor(color.hex) ? "1px solid hsl(var(--border))" : undefined;
  return <td className={cn("sticky border-r border-border font-medium whitespace-nowrap", isAdmin ? LEFT_ADMIN : LEFT_VIEW, compact ? CELL_COMPACT : "px-3 py-2.5", background, selected && SELECTED_ROW)}>
    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex || COLOR_FALLBACK, border }} /><span className="truncate max-w-[100px]">{color.name}</span></div>
  </td>;
}

function GridRow({ color, rowIndex, variants, model, selection, selectedId, isAdmin, compact, onSelect }: {
  color: VariantColor; rowIndex: number; variants: VariantGridItem[]; model: GridModel; selection: GridSelection;
  selectedId?: string | null; isAdmin: boolean; compact: boolean; onSelect?: VariantGridMatrixProps["onSelect"];
}) {
  const rowIds = variants.filter(variant => variant.color_name === color.name).map(variant => variant.id);
  const allRow = rowIds.length > 0 && rowIds.every(id => selection.selectedIds.has(id));
  const someRow = rowIds.some(id => selection.selectedIds.has(id));
  const background = rowIndex % 2 === 0 ? "bg-card" : "bg-muted/20";
  return <tr className={cn("transition-colors hover:bg-accent/30", background, someRow && SELECTED_ROW)}>
    {isAdmin && <AdminRowSelector color={color} allRow={allRow} someRow={someRow} compact={compact} background={background} selection={selection} />}
    <ColorLabel color={color} isAdmin={isAdmin} compact={compact} background={background} selected={someRow} />
    {model.sizes.map(size => <VariantCell key={size} variant={model.matrix.get(color.name)?.get(size)} color={color} size={size} selection={selection} selectedId={selectedId} isAdmin={isAdmin} compact={compact} onSelect={onSelect} />)}
  </tr>;
}

function sizeTotal(size: string, colors: VariantColor[], matrix: VariantMatrix) {
  return colors.reduce((total, color) => total + Math.max(0, matrix.get(color.name)?.get(size)?.stock ?? 0), 0);
}

function GridFooter({ model, isAdmin, compact }: { model: GridModel; isAdmin: boolean; compact: boolean }) {
  return <tfoot><tr className="bg-muted/60 font-semibold">
    {isAdmin && <td className={cn("sticky left-0 z-10 bg-muted/60 border-t border-r border-border", compact ? ADMIN_COMPACT : "px-2 py-2")} />}
    <td className={cn("sticky bg-muted/60 border-t border-r border-border text-muted-foreground", isAdmin ? LEFT_ADMIN : LEFT_VIEW, compact ? CELL_COMPACT : CELL_REGULAR)}>Total</td>
    {model.sizes.map(size => { const total = sizeTotal(size, model.colors, model.matrix); return <td key={size} className={cn("text-center border-t border-border", compact ? CELL_COMPACT : CELL_REGULAR, stockColor(total))}>{formatStock(total)}</td>; })}
  </tr></tfoot>;
}

function MultiAxisGrid({ variants, model, selection, selectedId, isAdmin, compact, onSelect }: {
  variants: VariantGridItem[]; model: GridModel; selection: GridSelection; selectedId?: string | null;
  isAdmin: boolean; compact: boolean; onSelect?: VariantGridMatrixProps["onSelect"];
}) {
  return <>
    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" />Grade Cor × Tamanho
      <Badge variant="secondary" className="text-[10px] px-1.5">{model.colors.length} cores × {model.sizes.length} tamanhos</Badge>
      {isAdmin && selection.selectedIds.size === 0 && <span className="text-[10px] text-muted-foreground ml-auto font-normal">Clique nas células para selecionar</span>}
    </h4>
    <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-xs">
      <GridHeader model={model} selection={selection} isAdmin={isAdmin} compact={compact} />
      <tbody>{model.colors.map((color, rowIndex) => <GridRow key={color.name} color={color} rowIndex={rowIndex} variants={variants} model={model} selection={selection} selectedId={selectedId} isAdmin={isAdmin} compact={compact} onSelect={onSelect} />)}</tbody>
      <GridFooter model={model} isAdmin={isAdmin} compact={compact} />
    </table></div>
  </>;
}

export function VariantGridMatrix({ variants, selectedId, onSelect, mode = "view", compact = false, onBulkAction, isBulkLoading = false }: VariantGridMatrixProps) {
  const model = useMemo(() => buildGridModel(variants), [variants]);
  const selection = useVariantSelection(variants, model.allVariantIds, onBulkAction);
  const isAdmin = mode === "admin" && Boolean(onBulkAction);
  if (variants.length === 0) return null;
  return <div className="space-y-3">
    {isAdmin && <BulkActions selection={selection} model={model} loading={isBulkLoading} />}
    {model.hasSizes
      ? <MultiAxisGrid variants={variants} model={model} selection={selection} selectedId={selectedId} isAdmin={isAdmin} compact={compact} onSelect={onSelect} />
      : <SingleAxisGrid model={model} selection={selection} selectedId={selectedId} isAdmin={isAdmin} onSelect={onSelect} />}
  </div>;
}
