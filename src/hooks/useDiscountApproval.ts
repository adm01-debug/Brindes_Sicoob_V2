/**
 * useDiscountApproval — Gerencia solicitações de aprovação de desconto
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logRlsDenial } from "@/lib/security/rls-denial-logger";

export interface DiscountApprovalRequest {
  id: string;
  quote_id: string;
  seller_id: string;
  requested_discount_percent: number;
  max_allowed_percent: number;
  status: "pending" | "approved" | "rejected";
  admin_id: string | null;
  admin_notes: string | null;
  seller_notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountApprovalWithQuote extends DiscountApprovalRequest {
  quote?: {
    quote_number: string;
    client_name: string | null;
    client_company: string | null;
    total: number;
    subtotal: number;
  };
  seller?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useDiscountApproval() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<DiscountApprovalWithQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // O núcleo da aprovação é uma RPC: pedido, status e histórico precisam
  // confirmar juntos. Notificação é deliberadamente posterior até a outbox
  // transacional estar integrada; uma falha dela fica visível ao operador.
  const requestApproval = useCallback(async (
    quoteId: string,
    requestedPercent: number,
    maxAllowedPercent: number,
    sellerNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("id, row_version")
        .eq("id", quoteId)
        .eq("seller_id", user.id)
        .single();
      if (quoteError) throw quoteError;

      const { data: result, error } = await supabase.rpc("request_discount_approval_atomic", {
        p_quote_id: quoteId,
        p_expected_quote_row_version: quote.row_version,
        p_requested_discount_percent: requestedPercent,
        p_seller_notes: sellerNotes || null,
      });
      if (error || !result || result.length !== 1) {
        if (error) await logRlsDenial(error, {
          table: "discount_approval_requests", op: "INSERT",
          endpoint: "useDiscountApproval.requestApproval",
          targetId: quoteId,
          targetSellerId: user.id,
          policyHint: "request_discount_approval_atomic",
          querySummary: `requestedPct=${requestedPercent}`,
        });
        throw error ?? new Error("A solicitação de desconto não foi confirmada.");
      }

      const approval = result[0];
      if (!approval) throw new Error("A solicitação de desconto não retornou confirmação.");
      const authoritativeLimit = Number(approval.max_allowed_percent);
      const markup = Number(approval.negotiation_markup_percent ?? 0);
      try {
        if (markup > 0) {
          const { error: auditError } = await supabase.from("admin_audit_log").insert({
            user_id: user.id,
            action: "quote_negotiation_markup_applied",
            resource_type: "quote",
            resource_id: quoteId,
            details: {
              negotiation_markup_percent: markup,
              real_discount_percent: approval.real_discount_percent,
              max_allowed_percent: authoritativeLimit,
              request_id: approval.request_id,
              context: "discount_approval_request",
            },
          });
          if (auditError) throw auditError;
        }

        const { data: adminRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (rolesError) throw rolesError;
        if (adminRoles?.length) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileError) throw profileError;
          const sellerName = profile?.full_name || "Vendedor";
          const message = markup > 0
            ? `${sellerName} solicitou desconto real de ${requestedPercent.toFixed(2)}% (markup +${markup.toFixed(1)}%, limite ${authoritativeLimit}%).`
            : `${sellerName} solicitou ${requestedPercent.toFixed(1)}% de desconto (limite ${authoritativeLimit}%).`;
          const { error: notificationError } = await supabase.from("workspace_notifications").insert(
            adminRoles.map((admin) => ({
              user_id: admin.user_id,
              title: "Solicitação de desconto",
              message,
              type: "warning",
              category: "discount",
              action_url: "/admin/usuarios?tab=discounts",
            })),
          );
          if (notificationError) throw notificationError;
        }
      } catch (notificationError) {
        console.error("A solicitação foi registrada, mas a notificação falhou:", notificationError);
        toast.warning("Solicitação registrada, mas a notificação precisa ser reenviada.");
      }

      toast.success("Solicitação de aprovação enviada ao admin!");
      return true;
    } catch (err) {
      console.error("Error requesting approval:", err);
      toast.error("Erro ao solicitar aprovação");
      return false;
    }
  }, [user]);

  const respondToApproval = useCallback(async (
    requestId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data: request, error: requestError } = await supabase
        // rls-allow: decisão administrativa por UUID; a RPC valida papel, estado e concorrência.
        .from("discount_approval_requests")
        .select("id, quote_id")
        .eq("id", requestId)
        .single();
      if (requestError) throw requestError;
      const { data: quote, error: quoteError } = await supabase
        // rls-allow: lookup administrativo pré-RPC; a RLS e a RPC validam autorização.
        .from("quotes")
        .select("id, row_version")
        .eq("id", request.quote_id)
        .single();
      if (quoteError) throw quoteError;

      const { data: result, error } = await supabase.rpc("respond_discount_approval_atomic", {
        p_request_id: requestId,
        p_expected_quote_row_version: quote.row_version,
        p_approved: approved,
        p_admin_notes: adminNotes || null,
      });
      if (error || !result || result.length !== 1) {
        if (error) await logRlsDenial(error, {
          table: "discount_approval_requests", op: "UPDATE",
          endpoint: "useDiscountApproval.respondToApproval",
          targetId: requestId,
          policyHint: "respond_discount_approval_atomic",
          querySummary: `decision=${approved ? "approved" : "rejected"}`,
        });
        throw error ?? new Error("A decisão de desconto não foi confirmada.");
      }

      const decision = result[0];
      if (!decision) throw new Error("A decisão de desconto não retornou confirmação.");
      try {
        const { error: notificationError } = await supabase.from("workspace_notifications").insert({
          user_id: decision.seller_id,
          title: approved ? "Desconto aprovado ✅" : "Desconto rejeitado ❌",
          message: approved
            ? `Seu desconto de ${decision.requested_discount_percent}% foi aprovado. O orçamento está pronto para envio.`
            : `Seu desconto de ${decision.requested_discount_percent}% foi rejeitado.${adminNotes ? ` Motivo: ${adminNotes}` : " Ajuste o desconto e tente novamente."}`,
          type: approved ? "success" : "error",
          category: "discount",
          action_url: `/orcamentos/${decision.quote_id}`,
        });
        if (notificationError) throw notificationError;
      } catch (notificationError) {
        console.error("A decisão foi registrada, mas a notificação falhou:", notificationError);
        toast.warning("Decisão registrada, mas a notificação precisa ser reenviada.");
      }

      toast.success(approved ? "Desconto aprovado!" : "Desconto rejeitado");
      return true;
    } catch (err) {
      console.error("Error responding to approval:", err);
      toast.error("Erro ao responder solicitação");
      return false;
    }
  }, [user]);

  // Fetch pending requests (admin)
  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        // rls-allow: fluxo de aprovação admin/seller; RLS filtra por papel
        .from("discount_approval_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        await logRlsDenial(error, {
          table: "discount_approval_requests", op: "SELECT",
          endpoint: "useDiscountApproval.fetchPendingRequests",
          policyHint: "dar_select_scope",
        });
        throw error;
      }
      const requests = (data || []) as DiscountApprovalRequest[];

      if (requests.length === 0) { setPendingRequests([]); return; }

      // Batch fetch quotes and sellers in parallel (no N+1)
      const quoteIds = [...new Set(requests.map(r => r.quote_id))];
      const sellerIds = [...new Set(requests.map(r => r.seller_id))];

      const [quotesRes, sellersRes] = await Promise.all([
        // rls-allow: fluxo de aprovação admin/seller; RLS filtra por papel
        supabase.from("quotes").select("id, quote_number, client_name, client_company, total, subtotal").in("id", quoteIds),
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", sellerIds),
      ]);

      const quotesMap = new Map((quotesRes.data || []).map(q => [q.id, q]));
      const sellersMap = new Map((sellersRes.data || []).map(s => [s.user_id, s]));

      const enriched: DiscountApprovalWithQuote[] = requests.map(req => ({
        ...req,
        quote: quotesMap.get(req.quote_id) || undefined,
        seller: sellersMap.get(req.seller_id) || undefined,
      }));

      setPendingRequests(enriched);
    } catch (err) {
      console.error("Error fetching approval requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get approval status for a specific quote
  const getApprovalStatus = useCallback(async (quoteId: string): Promise<DiscountApprovalRequest | null> => {
    try {
      const { data } = await supabase
        // rls-allow: fluxo de aprovação admin/seller; RLS filtra por papel
        .from("discount_approval_requests")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as DiscountApprovalRequest) || null;
    } catch {
      return null;
    }
  }, []);

  return {
    pendingRequests,
    isLoading,
    requestApproval,
    respondToApproval,
    fetchPendingRequests,
    getApprovalStatus,
  };
}
