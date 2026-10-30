import React from "react";
import { type ProposalTemplateData, formatPaymentTerms, formatDeliveryTime, formatShipping } from "../ProposalHtmlTemplate";

function CommercialConditions({ payment, delivery, shipping, validity }: {
  payment: string;
  delivery: string;
  shipping: string;
  validity: string;
}) {
  const cells = [["💳 Prazo de Pagamento", payment], ["📦 Prazo de Entrega", delivery],
    ["🚚 Frete", shipping], ["📅 Validade da Proposta", validity]];
  return <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}><tbody><tr>
    {cells.map(([label, value], index) => <td key={label}
      style={{ width: "25%", padding: index === 0 ? "0 8px 0 0" : index === 3 ? "0 0 0 8px" : "0 8px", verticalAlign: "top" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#333", fontWeight: 600, lineHeight: "1.4" }}>{value}</div>
    </td>)}
  </tr></tbody></table>;
}

function AcceptanceTerms() {
  return <div style={{ paddingTop: "8px" }}>
    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "9px", color: "#00c853",
      textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Termos de Aceite e Contratacao</div>
    <div style={{ fontSize: "9px", color: "#555", lineHeight: "1.38" }}>
      <div style={{ marginBottom: "4px" }}><span style={{ fontWeight: 700, color: "#333" }}>1. ACEITE - </span>
        A presente proposta constitui oferta formal (art. 427, Codigo Civil). A resposta do destinatario com expressoes de concordancia (&quot;aprovado&quot;, &quot;aceito&quot;, &quot;de acordo&quot; ou equivalentes), por e-mail ou aplicativo de mensagens, configura aceitacao plena de todos os termos, valores, prazos e especificacoes aqui descritos, formando contrato valido e vinculante (arts. 104, 107 e 427 a 435 do Codigo Civil).
      </div>
      <div><span style={{ fontWeight: 700, color: "#333" }}>2. REPRESENTACAO - </span>
        Ao aprovar esta proposta, o respondente declara que possui poderes suficientes para vincular a empresa identificada no campo &quot;EMPRESA&quot; a presente contratacao, estando autorizado a firmar compromissos comerciais nas condicoes aqui estipuladas.
      </div>
    </div>
  </div>;
}

export function ProposalNotes({ data }: { data: ProposalTemplateData }) {
  const paymentLabel = formatPaymentTerms(data.paymentTerms);
  const deliveryLabel = formatDeliveryTime(data.deliveryTime);
  const shippingLabel = formatShipping(data.shippingType, data.shippingCost);

  return (
    <div style={{ marginTop: "14px" }}>
      {/* Bloco de Condições Comerciais */}
      <div style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "12px 16px",
        backgroundColor: "#fafafa",
      }}>
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: "10px",
          color: "#00c853",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "8px",
          borderBottom: "2px solid #e8f5e9",
          paddingBottom: "4px",
        }}>
          Condicoes Comerciais
        </div>

        <CommercialConditions payment={paymentLabel || "À vista / Boleto / Pix"} delivery={deliveryLabel || "A combinar"}
          shipping={shippingLabel} validity={data.validUntil || "15 dias"} />

        <div style={{ fontSize: "9px", color: "#777", lineHeight: "1.5", paddingTop: "6px", marginBottom: "8px" }}>
          <div>- Todos os valores incluem personalizacao conforme descricao.</div>
          <div>- Todos os produtos passam por controle de qualidade.</div>
          {data.notes && <div>- {data.notes}</div>}
        </div>

        <AcceptanceTerms />
      </div>
    </div>
  );
}
