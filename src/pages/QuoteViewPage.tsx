import React, { useEffect, useState } from "react";
import { useParams, useNavigate, type NavigateFunction } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Copy, CreditCard, Edit2, Eye, FileText, History, Loader2, Monitor, MoreHorizontal, Package, Printer, RefreshCw, Shield, ShieldCheck, Truck, Undo2 } from "lucide-react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProposalHtmlTemplate, formatPaymentTerms, formatDeliveryTime } from "@/components/pdf/ProposalHtmlTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QuoteHistoryPanel } from "@/components/quotes/QuoteHistoryPanel";
import { toast } from "sonner";
import { QuoteStatusTimeline } from "@/components/quotes/QuoteStatusTimeline";
import { QuoteValidityBanner } from "@/components/quotes/QuoteValidityBanner";
import { ReorderCatalogValidityBanner } from "@/components/quotes/ReorderCatalogValidityBanner";
import { ReopenExpiredQuoteButton } from "@/components/quotes/ReopenExpiredQuoteButton";
import { QuoteConvertToOrder } from "@/components/quotes/QuoteConvertToOrder";
import { QuoteSingularApprovalActions } from "@/components/quotes/QuoteSingularApprovalActions";
import { QuoteMobileActionBar } from "@/components/quotes/QuoteMobileActionBar";
import { QuoteCommentsSection } from "@/components/quotes/QuoteCommentsSection";
import { QuoteApprovalLinkCard } from "@/components/quotes/QuoteApprovalLinkCard";
import { QuoteVersionHistory } from "@/components/quotes/QuoteVersionHistory";
import { QuoteApprovalNotes } from "@/components/quotes/QuoteApprovalNotes";
import { QuoteNextActionBanner } from "@/components/quotes/QuoteNextActionBanner";
import { TagManager } from "@/components/quotes/TagManager";
import { QuoteWhatsAppShare } from "@/components/quotes/QuoteWhatsAppShare";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { QuoteClientInfo } from "@/components/quotes/QuoteClientInfo";
import { QuoteItemsTable } from "@/components/quotes/QuoteItemsTable";
import { QuoteTotalsSummary } from "@/components/quotes/QuoteTotalsSummary";
import { PdfGenerationDialog } from "@/components/quotes/PdfGenerationDialog";
import { isQuoteCommerciallyEditable, QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { useQuoteViewData } from "./quote-view/useQuoteViewData";
import { useDiscountApproval, type DiscountApprovalRequest } from "@/hooks/useDiscountApproval";
import { updateQuoteStatusAtomically } from "@/services/quoteStatusTransition";
import type { Quote, QuoteItem } from "@/hooks/quotes/useQuotes";

const statusConfig = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, variant: v.badgeVariant }])
) as Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;

type QuoteViewState = ReturnType<typeof useQuoteViewData>;

function LoadingQuote() {
  return <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"><Skeleton className="h-10 w-48" /><Skeleton className="h-[600px] w-full" /></div>;
}

function MissingQuote({ navigate }: { navigate: NavigateFunction }) {
  return <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"><div className="text-center py-12"><FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h2 className="font-display text-xl font-semibold">Orçamento não encontrado</h2><p className="text-muted-foreground mt-2">O orçamento solicitado não existe ou foi removido.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/orcamentos")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Orçamentos</Button></div></div>;
}

function QuoteLoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-4"><div role="alert" className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"><FileText className="h-8 w-8 text-destructive" /><div><h2 className="font-display text-xl font-semibold">Falha ao abrir o orçamento</h2><p className="mt-1 text-sm text-muted-foreground">{message}</p></div><Button variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div></div>;
}

async function cancelSync(state: QuoteViewState, quote: Quote) {
  if (!quote.id) return;
  try {
    await updateQuoteStatusAtomically(quote.id, "pending", "Sincronização com Bitrix24 cancelada");
    state.setQuote((current) => current ? { ...current, status: "pending" } : current);
    toast.success("Sincronização cancelada");
  } catch (error: unknown) {
    toast.error("Erro ao cancelar", { description: error instanceof Error ? error.message : "Erro" });
  }
}

function QuoteAuditSheet({ quote, quoteId }: { quote: Quote; quoteId: string }) {
  return <Sheet><SheetTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()}><History className="h-4 w-4 mr-2" /> Trilha de Auditoria (10/10)</DropdownMenuItem></SheetTrigger><SheetContent className="sm:max-w-xl overflow-y-auto"><SheetHeader className="pb-6"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><ShieldCheck className="h-6 w-6 text-primary" /></div><div><SheetTitle className="text-xl font-bold">Relatório de Auditoria Digital</SheetTitle><SheetDescription className="text-xs">Trilha completa de eventos, acessos e alterações com validade jurídica.</SheetDescription></div></div></SheetHeader><div className="space-y-6"><div className="rounded-xl border bg-muted/30 p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Protocolo Digital</span><Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">Ativo</Badge></div><div className="grid grid-cols-2 gap-4 text-[11px]"><div><p className="text-muted-foreground">Document ID</p><p className="font-mono font-medium truncate">{quote.id}</p></div><div><p className="text-muted-foreground">Versão Atual</p><p className="font-medium">#{quote.quote_number}</p></div></div></div><QuoteHistoryPanel quoteId={quoteId} /></div></SheetContent></Sheet>;
}

async function duplicateQuote(state: QuoteViewState, quoteId: string, navigate: NavigateFunction) {
  const newQuote = await state.reorderQuote(quoteId);
  if (newQuote?.id) navigate(`/orcamentos/${newQuote.id}`);
}

function QuoteMoreActions({ state, quote, quoteId, navigate }: { state: QuoteViewState; quote: Quote; quoteId: string; navigate: NavigateFunction }) {
  const canCancelSync = quote.status === "sent" || state.isSyncing;
  const editable = isQuoteCommerciallyEditable(quote.status, quote.is_latest_version);
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Mais opções"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canCancelSync && <DropdownMenuItem onClick={() => cancelSync(state, quote)} className="text-destructive focus:text-destructive"><Undo2 className="h-4 w-4 mr-2" /> Cancelar Sincronização</DropdownMenuItem>}<DropdownMenuItem disabled={!editable} onClick={() => editable && navigate(`/orcamentos/${quoteId}/editar`)}><Edit2 className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem><DropdownMenuItem onClick={() => duplicateQuote(state, quoteId, navigate)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem><DropdownMenuItem onClick={() => state.setShowPresentation(true)}><Monitor className="h-4 w-4 mr-2" /> Modo Apresentação</DropdownMenuItem><QuoteAuditSheet quote={quote} quoteId={quoteId} /></DropdownMenuContent></DropdownMenu>;
}

function refreshQuote(state: QuoteViewState, quoteId: string) {
  state.fetchQuote(quoteId).then(state.setQuote);
}

function QuotePrimaryActions({ state, quote, quoteId }: { state: QuoteViewState; quote: Quote; quoteId: string }) {
  if (quote.status === "pending_approval") return null;
  const updateStatus = (newStatus: string, pdfUrl?: string) => {
    state.setQuote((current) => current ? { ...current, status: newStatus as Quote["status"], approved_pdf_url: pdfUrl } : current);
    state.fetchQuote(quoteId);
  };
  return <><div className="hidden md:flex items-center gap-2"><QuoteConvertToOrder quoteId={quoteId} status={quote.status} onConverted={() => refreshQuote(state, quoteId)} /><Button onClick={state.handleSyncBitrix} disabled={state.isSyncing} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">{state.isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{state.isSyncing ? "Sincronizando..." : "Sincronizar"}</Button></div><PdfGenerationDialog proposalData={state.proposalData} quoteId={quoteId} quoteNumber={quote.quote_number} quoteStatus={quote.status} clientPhone={quote.client_phone} approvalLink={state.approvalLink} onWhatsApp={state.handleWhatsAppShare} onShareLink={state.handleShareLink} onStatusUpdate={updateStatus} trigger={<Button className="gap-2"><Eye className="h-4 w-4" /> Preview Proposta</Button>} /></>;
}

function QuoteHeader({ state, quote, quoteId, navigate }: { state: QuoteViewState; quote: Quote; quoteId: string; navigate: NavigateFunction }) {
  const status = statusConfig[quote.status] ?? { label: quote.status, variant: "outline" as const };
  const createdAt = quote.created_at ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "-";
  return <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden"><div className="flex items-center gap-4"><Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/orcamentos")}><ArrowLeft className="h-5 w-5" /></Button><div><div className="flex items-center gap-3"><h1 className="font-display text-2xl font-bold">Orçamento {quote.quote_number}</h1><Badge variant={status.variant}>{status.label}</Badge></div><p className="text-muted-foreground">Criado em {createdAt}</p></div></div><div className="flex items-center gap-2"><Button variant="outline" className="hidden md:flex gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button><ReopenExpiredQuoteButton quoteId={quoteId} status={quote.status} isLatestVersion={quote.is_latest_version} onReopened={() => state.setQuote((current) => current ? { ...current, status: "draft" } : current)} /><QuotePrimaryActions state={state} quote={quote} quoteId={quoteId} /><QuoteMoreActions state={state} quote={quote} quoteId={quoteId} navigate={navigate} /></div></div>;
}

function QuoteStatusSection({ state, quote, quoteId }: { state: QuoteViewState; quote: Quote; quoteId: string }) {
  const revalidate = async () => state.setQuote(await state.fetchQuote(quoteId));
  return <><div className="flex flex-col md:flex-row gap-4 items-start print:hidden"><div className="flex-1 bg-card border rounded-lg p-4"><QuoteStatusTimeline status={quote.status} createdAt={quote.created_at} updatedAt={quote.updated_at} clientResponseAt={quote.client_response_at} isSyncing={state.isSyncing} /></div><QuoteValidityBanner validUntil={quote.valid_until} status={quote.status} pdfUrl={quote.approved_pdf_url} onDownloadPdf={state.handleDownloadPDF} /></div><div className="print:hidden"><ReorderCatalogValidityBanner quoteId={quoteId} canRevalidate={isQuoteCommerciallyEditable(quote.status, quote.is_latest_version)} onRevalidated={revalidate} /></div></>;
}

function runNextAction(state: QuoteViewState, action: string) {
  if (action === "share_link") state.handleShareLink();
  if (action === "view_history") (document.querySelector('[aria-label="Mais opções"]') as HTMLElement | null)?.click();
}

function DiscountApprovalBanner({ quote, approval }: { quote: Quote; approval: DiscountApprovalRequest | null }) {
  if (quote.status !== "pending_approval") return null;
  const description = approval ? `Desconto de ${approval.requested_discount_percent}% solicitado (limite: ${approval.max_allowed_percent}%). Aguardando decisão do administrador.` : "Este orçamento está aguardando a aprovação do administrador para o desconto aplicado.";
  return <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 flex items-center gap-3 print:hidden"><div className="p-2 rounded-lg bg-amber-500/15 shrink-0"><Shield className="h-5 w-5 text-amber-500" /></div><div className="flex-1"><p className="font-semibold text-sm text-amber-600">Aguardando aprovação de desconto</p><p className="text-xs text-muted-foreground mt-0.5">{description}</p></div><Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 shrink-0"><Shield className="h-3 w-3" /> Pendente</Badge></div>;
}

function QuoteApprovalSection({ state, quote, quoteId, approval }: { state: QuoteViewState; quote: Quote; quoteId: string; approval: DiscountApprovalRequest | null }) {
  return <><QuoteNextActionBanner quoteId={quoteId} status={quote.status} onAction={(action) => runNextAction(state, action)} /><QuoteApprovalNotes notes={quote.rejection_notes} status={quote.status} /><QuoteSingularApprovalActions quoteId={quoteId} status={quote.status} quoteNumber={quote.quote_number} onActionComplete={() => refreshQuote(state, quoteId)} /><DiscountApprovalBanner quote={quote} approval={approval} /></>;
}

function CommercialTerm({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">{icon}<div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-sm font-medium mt-0.5">{value}</p></div></div>;
}

function QuoteCommercialTerms({ quote }: { quote: Quote }) {
  if (!quote.payment_terms && !quote.delivery_time) return null;
  return <><Separator /><div><h3 className="font-display font-semibold mb-4">Condições Comerciais</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{quote.payment_terms && <CommercialTerm icon={<CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />} label="Pagamento" value={formatPaymentTerms(quote.payment_terms) || quote.payment_terms} />}{quote.delivery_time && <CommercialTerm icon={<Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />} label="Prazo de Entrega" value={formatDeliveryTime(quote.delivery_time) || quote.delivery_time} />}{quote.shipping_method && <CommercialTerm icon={<Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />} label="Frete" value={quote.shipping_method} />}</div></div></>;
}

function QuoteContent({ state, quote }: { state: QuoteViewState; quote: Quote }) {
  return <Card className="print:hidden"><Separator /><CardContent className="pt-6 space-y-6"><div className="flex flex-col md:flex-row gap-6 justify-between items-start"><QuoteClientInfo clientCompany={quote.client_company} clientName={quote.client_name} clientEmail={quote.client_email} clientPhone={quote.client_phone} clientCnpj={state.clientCnpj} /><div className="w-full md:w-48 space-y-2"><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</h4><TagManager tags={quote.tags || []} readonly onChange={() => undefined} /><QuoteWhatsAppShare quoteNumber={quote.quote_number || ""} total={quote.total} clientPhone={quote.client_phone} validUntil={quote.valid_until} approvalLink={state.approvalLink} className="w-full" /></div></div><Separator /><QuoteItemsTable items={(quote.items || []).map((item) => ({ ...item, product_id: item.product_id, product_sku: item.product_sku ?? null, product_image_url: item.product_image_url ?? null, color_name: item.color_name ?? null, color_hex: item.color_hex ?? null, kit_group_id: item.kit_group_id ?? null, kit_name: item.kit_name ?? null, price_updated_at: item.price_updated_at ?? null, price_freshness_threshold_days: item.price_freshness_threshold_days ?? null, personalizations: (item.personalizations ?? []).map((personalization) => ({ ...personalization })) }))} /><QuoteTotalsSummary items={quote.items || []} discountPercent={quote.discount_percent} discountAmount={quote.discount_amount} shippingType={quote.shipping_type} shippingCost={quote.shipping_cost} /><QuoteCommercialTerms quote={quote} />{quote.notes && <><Separator /><div><h3 className="font-display font-semibold mb-2">Observações</h3><p className="text-muted-foreground whitespace-pre-line">{quote.notes}</p></div></>}</CardContent></Card>;
}

function QuoteRelatedContent({ state, quote, quoteId }: { state: QuoteViewState; quote: Quote; quoteId: string }) {
  return <><QuoteVersionHistory quoteId={quoteId} currentQuoteId={quoteId} /><QuoteApprovalLinkCard quoteId={quoteId} clientName={quote.client_name} clientEmail={quote.client_email} /><QuoteCommentsSection quoteId={quoteId} />{state.proposalData && <div className="hidden print:block print:p-0"><ProposalHtmlTemplate data={state.proposalData} /></div>}</>;
}

function presentationDetails(item: QuoteItem) {
  const details: Array<{ label: string; value: string }> = [];
  if (item.quantity) details.push({ label: "Quantidade", value: String(item.quantity) });
  if (item.color_name) details.push({ label: "Cor", value: item.color_name });
  if (item.personalizations?.length) details.push({ label: "Personalização", value: item.personalizations.map((personalization) => personalization.technique_name).filter(Boolean).join(", ") || "Sim" });
  return details;
}

function presentationSlide(item: QuoteItem) {
  return { id: item.id || item.product_id, title: item.product_name, subtitle: item.product_sku ? `SKU: ${item.product_sku}` : undefined, imageUrl: item.product_image_url || null, badge: item.kit_name || item.color_name || null, details: presentationDetails(item) };
}

function QuotePresentation({ state, quote }: { state: QuoteViewState; quote: Quote }) {
  if (!state.showPresentation || !quote.items?.length) return null;
  return <PresentationMode title={`Proposta ${quote.quote_number || ""}`} subtitle={quote.client_company || quote.client_name || undefined} brandName="Brindes Sicoob" onClose={() => state.setShowPresentation(false)} slides={quote.items.map(presentationSlide)} />;
}

function LoadedQuote({ state, quote, quoteId, navigate, approval }: { state: QuoteViewState; quote: Quote; quoteId: string; navigate: NavigateFunction; approval: DiscountApprovalRequest | null }) {
  return <><PageSEO title={`Orçamento ${quote.quote_number}`} description={`Visualização do orçamento ${quote.quote_number}`} path={`/orcamentos/${quoteId}`} noIndex /><div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in print:py-0 print:max-w-none print:px-0"><QuoteHeader state={state} quote={quote} quoteId={quoteId} navigate={navigate} /><QuoteStatusSection state={state} quote={quote} quoteId={quoteId} /><QuoteApprovalSection state={state} quote={quote} quoteId={quoteId} approval={approval} /><QuoteContent state={state} quote={quote} /><QuoteRelatedContent state={state} quote={quote} quoteId={quoteId} /></div><QuoteMobileActionBar onDownloadPDF={state.handleDownloadPDF} onWhatsApp={state.handleWhatsAppShare} onSync={state.handleSyncBitrix} isSyncing={state.isSyncing} onShare={state.handleShareLink} isGeneratingPDF={state.isGeneratingPDF} /><QuotePresentation state={state} quote={quote} /></>;
}

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getApprovalStatus } = useDiscountApproval();
  const [approvalRequest, setApprovalRequest] = useState<DiscountApprovalRequest | null>(null);
  const state = useQuoteViewData(id);
  useEffect(() => {
    if (id && state.quote?.status === "pending_approval") getApprovalStatus(id).then(setApprovalRequest);
  }, [id, state.quote?.status, getApprovalStatus]);
  if (state.isLoadingQuote) return <LoadingQuote />;
  if (state.quoteLoadError) {
    return <QuoteLoadFailure message={state.quoteLoadError} onRetry={state.retryQuoteLoad} />;
  }
  if (!state.quote) return <MissingQuote navigate={navigate} />;
  const quoteId = id || state.quote.id;
  if (!quoteId) return <MissingQuote navigate={navigate} />;
  return <LoadedQuote state={state} quote={state.quote} quoteId={quoteId} navigate={navigate} approval={approvalRequest} />;
}
