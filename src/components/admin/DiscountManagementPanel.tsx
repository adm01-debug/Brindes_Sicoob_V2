/**
 * DiscountManagementPanel — Painel completo de Gestão de Descontos
 * (limites por vendedor + fila de aprovações). Extraído da antiga
 * AdminDiscountApprovalsPage para reutilização dentro de Usuários.
 */
import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  Filter,
  Eye,
} from "lucide-react";

const MUTED_CARD_BORDER = "border-border/50";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSellerDiscountLimits } from "@/hooks/useSellerDiscountLimits";
import { useDiscountApproval, type DiscountApprovalWithQuote } from "@/hooks/useDiscountApproval";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SellerProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

type ApprovalFilter = "all" | "pending" | "approved" | "rejected";
type RespondAction = "approve" | "reject" | null;

interface RespondDialogState {
  open: boolean;
  request: DiscountApprovalWithQuote | null;
  action: RespondAction;
  notes: string;
}

interface EditLimitDialogState {
  open: boolean;
  userId: string;
  name: string;
  currentLimit: number;
  notes: string;
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.05, duration: 0.3 } }),
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function emptyApprovalTitle(filter: ApprovalFilter): string {
  if (filter === "all") return "Nenhuma solicitação";
  if (filter === "pending") return "Nenhuma solicitação pendente";
  if (filter === "approved") return "Nenhuma solicitação aprovada";
  return "Nenhuma solicitação rejeitada";
}

function emptyApprovalDescription(filter: ApprovalFilter): string {
  return filter === "pending" ? "Todas as solicitações foram respondidas" : "Não há registros para este filtro";
}

export function DiscountManagementPanel() {
  const navigate = useNavigate();
  const { limits, isLoading: limitsLoading, fetchAllLimits, setLimit, deleteLimit } = useSellerDiscountLimits();
  const { pendingRequests, isLoading: requestsLoading, fetchPendingRequests, respondToApproval } = useDiscountApproval();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [editDialog, setEditDialog] = useState<EditLimitDialogState>({ open: false, userId: "", name: "", currentLimit: 5, notes: "" });
  const [respondDialog, setRespondDialog] = useState<RespondDialogState>({ open: false, request: null, action: null, notes: "" });

  useEffect(() => {
    fetchAllLimits();
    fetchPendingRequests();
    fetchSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role")
      .order("full_name");
    setSellers((data || []) as SellerProfile[]);
  };

  const handleSetLimit = async () => {
    const ok = await setLimit(editDialog.userId, editDialog.currentLimit, editDialog.notes);
    if (ok) {
      setEditDialog({ open: false, userId: "", name: "", currentLimit: 5, notes: "" });
      fetchAllLimits();
    }
  };

  const handleRespond = async () => {
    if (!respondDialog.request || !respondDialog.action) return;
    const ok = await respondToApproval(
      respondDialog.request.id,
      respondDialog.action === "approve",
      respondDialog.notes,
    );
    if (ok) {
      setRespondDialog({ open: false, request: null, action: null, notes: "" });
      fetchPendingRequests();
    }
  };

  const getLimitForSeller = (userId: string) => limits.find((l) => l.user_id === userId);

  const stats = useMemo(() => {
    const pendingCount = pendingRequests.filter((r) => r.status === "pending").length;
    const approvedCount = pendingRequests.filter((r) => r.status === "approved").length;
    const rejectedCount = pendingRequests.filter((r) => r.status === "rejected").length;
    const sellersWithLimit = limits.length;
    const avgLimit = limits.length > 0 ? limits.reduce((s, l) => s + l.max_discount_percent, 0) / limits.length : 0;
    return { pendingCount, approvedCount, rejectedCount, sellersWithLimit, avgLimit };
  }, [pendingRequests, limits]);

  const filteredSellers = useMemo(() => {
    if (!searchTerm) return sellers;
    const term = searchTerm.toLowerCase();
    return sellers.filter(
      (s) => (s.full_name || "").toLowerCase().includes(term) || (s.email || "").toLowerCase().includes(term),
    );
  }, [sellers, searchTerm]);

  const filteredApprovals = useMemo(() => {
    if (approvalFilter === "all") return pendingRequests;
    return pendingRequests.filter((r) => r.status === approvalFilter);
  }, [pendingRequests, approvalFilter]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {(<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: stats.pendingCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: stats.pendingCount > 0 ? "border-amber-500/30" : MUTED_CARD_BORDER },
          { label: "Aprovados", value: stats.approvedCount, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: MUTED_CARD_BORDER },
          { label: "Rejeitados", value: stats.rejectedCount, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: MUTED_CARD_BORDER },
          { label: "Com Limite", value: stats.sellersWithLimit, icon: Users, color: "text-primary", bg: "bg-primary/10", border: MUTED_CARD_BORDER, suffix: ` / ${sellers.length}` },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={CARD_VARIANTS}>
            <Card className={cn("border", stat.border)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {stat.value}
                    {stat.suffix && <span className="text-sm font-normal text-muted-foreground">{stat.suffix}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>)}

      <Tabs defaultValue="limits" className="space-y-4">
        {(<TabsList className="h-10">
          <TabsTrigger value="limits" className="gap-2 px-4">
            <Percent className="h-4 w-4" /> Limites
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2 px-4 relative">
            <Clock className="h-4 w-4" /> Aprovações
            {stats.pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {stats.pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>)}

        {/* === LIMITS TAB === */}
        {(<TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Limites de Desconto por Vendedor
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar vendedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              {stats.avgLimit > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  Média de limite: <span className="font-semibold">{stats.avgLimit.toFixed(1)}%</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              {limitsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence mode="popLayout">
                      {filteredSellers.map((seller, idx) => {
                        const limit = getLimitForSeller(seller.user_id);
                        return (
                          <motion.div
                            key={seller.user_id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                                  limit ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                                )}
                              >
                                {(seller.full_name || seller.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{seller.full_name || seller.email}</p>
                                <p className="text-xs text-muted-foreground">{seller.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {limit ? (
                                <Badge variant="secondary" className="gap-1 tabular-nums font-semibold">
                                  <Percent className="h-3 w-3" />
                                  {limit.max_discount_percent}% máx
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground font-normal">
                                  Sem limite definido
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  setEditDialog({
                                    open: true,
                                    userId: seller.user_id,
                                    name: seller.full_name || seller.email || "",
                                    currentLimit: limit?.max_discount_percent || 5,
                                    notes: limit?.notes || "",
                                  })
                                }
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              {limit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive opacity-50 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                  onClick={async () => {
                                    await deleteLimit(limit.id);
                                    fetchAllLimits();
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {filteredSellers.length === 0 && (
                      <div className="text-center py-10 space-y-2">
                        <Search className="h-8 w-8 mx-auto text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? "Nenhum vendedor encontrado para esta busca" : "Nenhum vendedor cadastrado"}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>)}

        {/* === APPROVALS TAB === */}
        {(<TabsContent value="approvals" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "pending", "approved", "rejected"] as ApprovalFilter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={approvalFilter === f ? "default" : "outline"}
                className={cn(
                  "h-7 text-xs gap-1.5",
                  approvalFilter === f && f === "pending" && "bg-amber-500 hover:bg-amber-600 text-white",
                )}
                onClick={() => setApprovalFilter(f)}
              >
                {f === "all" && "Todos"}
                {f === "pending" && (
                  <>
                    <Clock className="h-3 w-3" /> Pendentes
                  </>
                )}
                {f === "approved" && (
                  <>
                    <CheckCircle className="h-3 w-3" /> Aprovados
                  </>
                )}
                {f === "rejected" && (
                  <>
                    <XCircle className="h-3 w-3" /> Rejeitados
                  </>
                )}
                <span className="ml-0.5 tabular-nums">
                  ({f === "all" ? pendingRequests.length : pendingRequests.filter((r) => r.status === f).length})
                </span>
              </Button>
            ))}
          </div>

          {requestsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredApprovals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-base">{emptyApprovalTitle(approvalFilter)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{emptyApprovalDescription(approvalFilter)}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredApprovals.map((request, index) => (
                  <ApprovalCard key={request.id} request={request} index={index} navigate={navigate} setRespondDialog={setRespondDialog} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>)}
      </Tabs>

      <EditLimitDialog state={editDialog} setState={setEditDialog} onSave={handleSetLimit} />
      <RespondApprovalDialog state={respondDialog} setState={setRespondDialog} onRespond={handleRespond} />
    </div>
  );
}

interface EditLimitDialogProps {
  state: EditLimitDialogState;
  setState: Dispatch<SetStateAction<EditLimitDialogState>>;
  onSave: () => Promise<void>;
}

function EditLimitDialog({ state, setState, onSave }: EditLimitDialogProps) {
  const close = () => setState((current) => ({ ...current, open: false }));
  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Limite de Desconto</DialogTitle>
          <DialogDescription>
            Defina o desconto máximo para <span className="font-semibold text-foreground">{state.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Desconto Máximo (%)</Label>
            <div className="relative">
              <Input type="number" min={0} max={100} step={0.5} value={state.currentLimit}
                onChange={(event) => setState((current) => ({ ...current, currentLimit: parseFloat(event.target.value) || 0 }))}
                className="pr-8 text-lg font-semibold" />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(state.currentLimit, 100)}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea value={state.notes} onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Observações sobre este limite..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={onSave} className="gap-1.5"><CheckCircle className="h-4 w-4" />Salvar Limite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RespondApprovalDialogProps {
  state: RespondDialogState;
  setState: Dispatch<SetStateAction<RespondDialogState>>;
  onRespond: () => Promise<void>;
}

function actionCopy(action: RespondAction) {
  const approving = action === "approve";
  return {
    approving,
    title: approving ? "Aprovar Desconto" : "Rejeitar Desconto",
    description: approving
      ? "O vendedor poderá aplicar o desconto solicitado ao orçamento."
      : "O vendedor será notificado e deverá ajustar o desconto.",
    label: action === "reject" ? "Motivo da rejeição" : "Notas (opcional)",
    placeholder: action === "reject" ? "Explique o motivo da rejeição..." : "Observações...",
  };
}

function RespondRequestDetails({ request }: { request: DiscountApprovalWithQuote }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/40 p-4 space-y-2">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoCell label="Orçamento" value={request.quote?.quote_number || "—"} />
        <InfoCell label="Vendedor" value={request.seller?.full_name || "—"} />
        <InfoCell label="Desconto solicitado" value={`${request.requested_discount_percent}%`} valueClass="text-amber-500 font-bold" />
        <InfoCell label="Limite autorizado" value={`${request.max_allowed_percent}%`} />
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden mt-1">
        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/40"
          style={{ width: `${Math.min(request.max_allowed_percent, 100)}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
          style={{ width: `${Math.min(request.requested_discount_percent, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>0%</span><span>{request.max_allowed_percent}% (limite)</span><span>100%</span>
      </div>
    </div>
  );
}

function RespondApprovalDialog({ state, setState, onRespond }: RespondApprovalDialogProps) {
  const copy = actionCopy(state.action);
  const close = () => setState((current) => ({ ...current, open: false }));
  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {copy.approving ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {state.request && (
          <div className="space-y-4 py-2">
            <RespondRequestDetails request={state.request} />
            <div className="space-y-2">
              <Label>{copy.label}</Label>
              <Textarea value={state.notes} onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
                placeholder={copy.placeholder} rows={3} autoFocus />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button className={cn("gap-1.5", copy.approving && "bg-emerald-500 hover:bg-emerald-600 text-white")}
            variant={state.action === "reject" ? "destructive" : "default"} onClick={onRespond}>
            {copy.approving ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {copy.approving ? "Confirmar Aprovação" : "Confirmar Rejeição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-medium mt-0.5 truncate", valueClass)}>{value}</p>
    </div>
  );
}

type Navigate = ReturnType<typeof useNavigate>;

interface ApprovalCardProps {
  request: DiscountApprovalWithQuote;
  index: number;
  navigate: Navigate;
  setRespondDialog: Dispatch<SetStateAction<RespondDialogState>>;
}

function approvalCardClass(status: DiscountApprovalWithQuote["status"]): string {
  if (status === "pending") return "border-amber-500/40 bg-amber-500/[0.03]";
  if (status === "approved") return "border-emerald-500/30";
  return "border-destructive/20";
}

function approvalBadgeClass(status: DiscountApprovalWithQuote["status"]): string {
  if (status === "pending") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  if (status === "approved") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function ApprovalStatus({ status }: { status: DiscountApprovalWithQuote["status"] }) {
  if (status === "pending") return <><Clock className="h-3 w-3" />Pendente</>;
  if (status === "approved") return <><CheckCircle className="h-3 w-3" />Aprovado</>;
  return <><XCircle className="h-3 w-3" />Rejeitado</>;
}

function openResponse(
  request: DiscountApprovalWithQuote,
  action: Exclude<RespondAction, null>,
  setter: Dispatch<SetStateAction<RespondDialogState>>,
): void {
  setter({ open: true, request, action, notes: "" });
}

function ApprovalActions({ request, setRespondDialog }: Pick<ApprovalCardProps, "request" | "setRespondDialog">) {
  if (request.status !== "pending") return null;
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
        onClick={() => openResponse(request, "approve", setRespondDialog)}>
        <CheckCircle className="h-3.5 w-3.5" /> Aprovar
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5"
        onClick={() => openResponse(request, "reject", setRespondDialog)}>
        <XCircle className="h-3.5 w-3.5" /> Rejeitar
      </Button>
    </div>
  );
}

function ApprovalNotes({ request }: { request: DiscountApprovalWithQuote }) {
  return (
    <>
      {request.seller_notes && (
        <div className="rounded-lg bg-muted/50 border border-border/40 px-3 py-2 text-sm">
          <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Nota do vendedor</span>
          <p className="mt-0.5 text-foreground/80">{request.seller_notes}</p>
        </div>
      )}
      {request.admin_notes && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
          <span className="font-semibold text-xs text-primary uppercase tracking-wide">Nota do admin</span>
          <p className="mt-0.5 text-foreground/80">{request.admin_notes}</p>
        </div>
      )}
    </>
  );
}

function ApprovalCard({ request, index, navigate, setRespondDialog }: ApprovalCardProps) { return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }} transition={{ delay: index * 0.03 }}>
      <Card className={cn("transition-all hover:shadow-md", approvalCardClass(request.status))}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={cn("gap-1 font-semibold", approvalBadgeClass(request.status))}>
                  <ApprovalStatus status={request.status} />
                </Badge>
                {request.quote && (
                  <Button variant="ghost" size="sm"
                    className="h-6 px-2 text-sm font-mono font-semibold text-foreground hover:text-primary gap-1"
                    onClick={() => navigate(`/orcamentos/${request.quote_id}`)}>
                    {request.quote.quote_number}<Eye className="h-3 w-3" />
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {format(new Date(request.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoCell label="Vendedor" value={request.seller?.full_name || "—"} />
                <InfoCell label="Cliente" value={request.quote?.client_name || request.quote?.client_company || "—"} />
                <InfoCell label="Solicitado" value={`${request.requested_discount_percent}%`} valueClass="text-amber-500 font-bold" />
                <InfoCell label="Limite" value={`${request.max_allowed_percent}%`} />
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/50 transition-all"
                  style={{ width: `${Math.min(request.max_allowed_percent, 100)}%` }} />
                <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all",
                  request.requested_discount_percent > request.max_allowed_percent ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(request.requested_discount_percent, 100)}%` }} />
              </div>
              {request.quote && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Total do orçamento:</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrency(request.quote.total)}</span>
                </div>
              )}
              <ApprovalNotes request={request} />
            </div>
            <ApprovalActions request={request} setRespondDialog={setRespondDialog} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ); }
