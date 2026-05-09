import React from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteWhatsAppShareProps {
  quoteNumber: string;
  total: number;
  clientPhone?: string | null;
  validUntil?: string | null;
  approvalLink?: string | null;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function QuoteWhatsAppShare({
  quoteNumber,
  total,
  clientPhone,
  validUntil,
  approvalLink,
  className,
  variant = "outline",
  size = "default",
}: QuoteWhatsAppShareProps) {
  const handleShare = () => {
    const lines = [
      `📋 *Proposta Comercial ${quoteNumber}*`,
      "",
      `💰 Valor Total: *${total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}*`,
    ];

    if (validUntil) {
      lines.push(
        `📅 Válida até: ${format(new Date(validUntil), "dd/MM/yyyy", {
          locale: ptBR,
        })}`
      );
    }

    if (approvalLink) {
      lines.push("", `✅ Visualizar e aprovar proposta:`, approvalLink);
    }

    lines.push("", "Qualquer dúvida, estou à disposição! 😊");

    const message = encodeURIComponent(lines.join("\n"));
    const phone = clientPhone?.replace(/\D/g, "") || "";
    
    // Se tiver telefone, envia direto, senão abre a lista de contatos
    const url = phone
      ? `https://wa.me/55${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
    toast.success("WhatsApp aberto!");
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={cn("gap-2 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10", className)}
    >
      <MessageCircle className="h-4 w-4" />
      {size !== "icon" && "WhatsApp"}
    </Button>
  );
}
