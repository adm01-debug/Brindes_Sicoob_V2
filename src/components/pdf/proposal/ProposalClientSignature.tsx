import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

interface Props {
  data: ProposalTemplateData;
}

export function ProposalClientSignature({ data }: Props) {
  const { client } = data;
  
  return (
    <div style={{
      padding: "0 36px",
      marginTop: "40px",
      display: "flex",
      justifyContent: "flex-end",
    }}>
      <div style={{
        textAlign: "center",
        minWidth: "220px",
        maxWidth: "280px",
      }}>
        {/* Signature line */}
        <div style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#999",
          margin: "30px auto 6px auto",
        }} />

        {/* Client Label */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: "11px",
          color: "#333",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Aceite do Cliente
        </div>

        {/* Client Name/Company */}
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "11px",
          color: "#777",
          marginTop: "2px",
        }}>
          {client?.company || client?.name || "Representante Autorizado"}
        </div>
        
        {/* Date block */}
        <div style={{
          fontSize: "9px",
          color: "#aaa",
          marginTop: "12px",
          border: "1px dashed #eee",
          padding: "4px",
          borderRadius: "4px"
        }}>
          Data: ____ / ____ / ________
        </div>
      </div>
    </div>
  );
}
