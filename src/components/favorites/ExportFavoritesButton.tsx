/** Exporta favoritos em CSV, JSON ou PDF. */
import { useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, FileJson, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Product } from "@/types/product-catalog";
import type { FavoriteListItem } from "@/hooks/useFavoriteLists";
import { formatCurrency } from "@/lib/format";
import type { jsPDF } from "jspdf";

interface Props { products: Product[]; rawItems?: FavoriteListItem[]; listName: string }
type ExportFormat = "csv" | "json" | "pdf";
type ItemMap = Map<string, FavoriteListItem>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function productCsvFields(product: Product) {
  return [product.sku ?? "", product.name, (product.price ?? 0).toFixed(2), product.category_name ?? product.category?.name ?? ""];
}

function itemCsvFields(item?: FavoriteListItem) {
  if (!item) return ["", "", "", ""];
  return [item.variant_info?.color_name ?? "", item.note ?? "", item.price_at_save?.toFixed(2) ?? "", item.added_at ?? ""];
}

function csvRow(product: Product, items: ItemMap) {
  const values = [...productCsvFields(product), ...itemCsvFields(items.get(product.id))];
  return values.map(csvEscape).join(",");
}

function exportCsv(products: Product[], items: ItemMap, filename: string) {
  const headers = ["SKU", "Nome", "Preço (R$)", "Categoria", "Variante", "Nota", "Salvo em (R$)", "Adicionado em"];
  const csv = [headers.join(","), ...products.map(product => csvRow(product, items))].join("\n");
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

function favoriteJsonFields(item?: FavoriteListItem) {
  if (!item) return { variant: null, note: null, price_at_save: null, added_at: null };
  return { variant: item.variant_info ?? null, note: item.note ?? null, price_at_save: item.price_at_save ?? null, added_at: item.added_at ?? null };
}

function jsonItem(product: Product, items: ItemMap) {
  return { product_id: product.id, sku: product.sku, name: product.name, price: product.price,
    category: product.category_name ?? product.category?.name, image: product.images?.[0], ...favoriteJsonFields(items.get(product.id)) };
}

function exportJson(products: Product[], items: ItemMap, listName: string, filename: string) {
  const payload = { list: listName, exported_at: new Date().toISOString(), total: products.length, items: products.map(product => jsonItem(product, items)) };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${filename}.json`);
}

function drawPdfHeader(doc: jsPDF, listName: string, count: number, margin: number) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(listName, margin, margin + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`${count} produtos • Exportado em ${new Date().toLocaleDateString("pt-BR")}`, margin, margin + 12); doc.setTextColor(0);
}

interface PdfCardGeometry { x: number; y: number; width: number; height: number }

function drawPdfImage(doc: jsPDF, image: string | undefined, geometry: PdfCardGeometry) {
  if (!image) return;
  try { doc.addImage(image, "JPEG", geometry.x + 4, geometry.y + 4, geometry.width - 8, geometry.height * 0.55, undefined, "FAST"); } catch { /* imagem externa incompatível */ }
}

function drawPdfCard(doc: jsPDF, product: Product, item: FavoriteListItem | undefined, geometry: PdfCardGeometry) {
  const { x, y, width, height } = geometry;
  doc.setDrawColor(200); doc.roundedRect(x + 1, y + 1, width - 2, height - 2, 2, 2);
  drawPdfImage(doc, product.images?.[0], geometry);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(doc.splitTextToSize(product.name, width - 8).slice(0, 2), x + 4, y + height * 0.6 + 4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120); doc.text(product.sku ?? "—", x + 4, y + height * 0.6 + 14);
  doc.setFont("helvetica", "bold"); doc.setTextColor(20); doc.setFontSize(11); doc.text(formatCurrency(product.price ?? 0), x + 4, y + height * 0.6 + 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(120);
  if (item?.variant_info?.color_name) doc.text(`Cor: ${item.variant_info.color_name}`, x + 4, y + height * 0.6 + 28);
  if (item?.note) doc.text(doc.splitTextToSize(`✎ ${item.note}`, width - 8).slice(0, 2), x + 4, y + height * 0.6 + 33);
}

function populatePdf(doc: jsPDF, products: Product[], items: ItemMap, margin: number) {
  const columns = 2;
  const rows = 3;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = (pageWidth - margin * 2) / columns;
  const height = (pageHeight - margin * 2 - 20) / rows;
  const perPage = columns * rows;
  products.forEach((product, index) => {
    if (index > 0 && index % perPage === 0) doc.addPage();
    const pageIndex = index % perPage;
    const geometry = { x: margin + (pageIndex % columns) * width, y: margin + 20 + Math.floor(pageIndex / columns) * height, width, height };
    drawPdfCard(doc, product, items.get(product.id), geometry);
  });
}

async function exportPdf(products: Product[], items: ItemMap, listName: string, filename: string) {
  const { jsPDF: Pdf } = await import("jspdf");
  const doc = new Pdf({ orientation: "portrait", unit: "mm", format: "a4" });
  drawPdfHeader(doc, listName, products.length, 12);
  populatePdf(doc, products, items, 12);
  doc.save(`${filename}.pdf`);
}

function safeFilename(listName: string) {
  return listName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "favoritos";
}

function useFavoriteExports({ products, rawItems, listName }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const items = new Map(rawItems?.map(item => [item.product_id, item]) ?? []);
  const filename = `${safeFilename(listName)}-${new Date().toISOString().slice(0, 10)}`;
  const execute = async (format: ExportFormat, operation: () => void | Promise<void>) => {
    setBusy(format);
    try { await operation(); toast.success(`${format.toUpperCase()} exportado`); }
    catch (error) { toast.error(`Erro ao exportar ${format.toUpperCase()}: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
    finally { setBusy(null); }
  };
  return { busy, exportCsv: () => execute("csv", () => exportCsv(products, items, filename)),
    exportJson: () => execute("json", () => exportJson(products, items, listName, filename)),
    exportPdf: () => execute("pdf", () => exportPdf(products, items, listName, filename)) };
}

function ExportOption({ onClick, disabled, icon, title, description }: { onClick: () => void; disabled: boolean; icon: ReactNode; title: string; description: string }) {
  return <DropdownMenuItem onClick={onClick} disabled={disabled}>{icon}<div className="flex-1"><p className="text-sm font-medium">{title}</p><p className="text-[10px] text-muted-foreground">{description}</p></div></DropdownMenuItem>;
}

export function ExportFavoritesButton(props: Props) {
  const exports = useFavoriteExports(props);
  const busy = exports.busy !== null;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={busy || props.products.length === 0}>
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}<span className="hidden sm:inline ml-1.5 text-xs">Exportar</span>
  </Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel className="text-xs">Formato</DropdownMenuLabel><DropdownMenuSeparator />
    <ExportOption onClick={exports.exportPdf} disabled={busy} icon={<FileText className="h-4 w-4 mr-2 text-destructive" />} title="PDF Catálogo" description="Apresentação 2×3 cards/página" />
    <ExportOption onClick={exports.exportCsv} disabled={busy} icon={<FileSpreadsheet className="h-4 w-4 mr-2 text-success" />} title="CSV (Excel)" description="Planilha pronta para abrir" />
    <ExportOption onClick={exports.exportJson} disabled={busy} icon={<FileJson className="h-4 w-4 mr-2 text-primary" />} title="JSON" description="Para integrações" />
  </DropdownMenuContent></DropdownMenu>;
}
