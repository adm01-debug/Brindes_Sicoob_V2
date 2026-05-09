import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  data: ProposalTemplateData;
  isLastPage?: boolean;
  pageNumber: number;
  totalPages: number;
}

export function ProposalFooter({ data, isLastPage, pageNumber, totalPages }: Props) {
  const printDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  
  // URL base para verificação (em produção seria o domínio real)
  const verificationUrl = `${window.location.origin}/verificar/${data.quoteId || 'preview'}`;
  const idHash = data.idHash || "N/A";

  return (
    <div style={{ width: "794px", flexShrink: 0, marginTop: "auto", position: "relative" }}>
      {/* Verification Stamp & QR Code */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        padding: "0 36px 6px 36px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "2px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: "2px" }}>
            <QRCodeSVG 
              value={verificationUrl} 
              size={32} 
              level="L"
              includeMargin={false}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: "7px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span style={{ fontWeight: 800, color: "#555" }}>Documento Autêntico</span>
            <span>Hash: {idHash}</span>
            <span>Verificado em: {printDate}</span>
          </div>
        </div>

        <div style={{ textAlign: "right", fontSize: "7px", color: "#aaa" }}>
          <span>ID: {data.quoteId || 'RASCUNHO'} — Versão {data.status || 'DRAFT'}</span>
        </div>
      </div>

      {/* Page info */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        padding: "4px 36px", 
        fontSize: "8px", 
        color: "#999", 
        fontVariantNumeric: "tabular-nums",
        borderTop: "1px solid #f0f0f0"
      }}>
        <span>Página {pageNumber} de {totalPages}</span>
        <span style={{ fontWeight: 500 }}>Este documento tem validade jurídica conforme MP 2.200-2/2001.</span>
      </div>

      {/* Green bar */}
      <div style={{ width: "794px", height: "15px", backgroundColor: "#00c853" }} />
    </div>
  );
}
