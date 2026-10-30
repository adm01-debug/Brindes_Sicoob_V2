import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

interface Props {
  data: ProposalTemplateData;
}

const SIGNATURE_LABEL_STYLE = {
  fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px",
  color: "#333", textTransform: "uppercase" as const, letterSpacing: "0.5px",
};

function SignatureIdentity({ name }: { name: string }) {
  return <><div style={{ width: "100%", height: "1px", backgroundColor: "#999", margin: "30px auto 6px auto" }} />
    <div style={SIGNATURE_LABEL_STYLE}>Aceite do Cliente</div>
    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "#777", marginTop: "2px" }}>{name}</div>
    <div style={{ fontSize: "9px", color: "#aaa", marginTop: "12px", border: "1px dashed #eee", padding: "4px", borderRadius: "4px" }}>
      Data: ____ / ____ / ________
    </div></>;
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
      <div style={{ textAlign: "center", minWidth: "220px", maxWidth: "280px" }}>
        <SignatureIdentity name={client?.company || client?.name || "Representante Autorizado"} />
      </div>
    </div>
  );
}
