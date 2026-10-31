/**
 * Sub-sections extracted from ProposalHtmlTemplate:
 * HeaderSection, ClientBar, ProductRow, TotalsSection, NotesSection, FooterSection
 */
import React from "react";
import { GREEN, GREEN_DARK, DARK, BLUE, fmt, thStyle, tdStyle, totalsRowStyle } from "./ProposalStyles";
import { formatPaymentTerms, formatDeliveryTime, formatShipping, type ProposalItem, type ProposalTemplateData } from "./ProposalHtmlTemplate";

/* ─── Header ─── */
const MONTSERRAT = "'Montserrat', sans-serif";
const LIGHT_BORDER = "1px solid #eee";

export function HeaderSection({ data }: { data: ProposalTemplateData }) {
  const H = 160;
  const W = 794;
  const barH = 7;
  const darkStart = 340;
  const greenStart = 310;
  const darkEnd = 390;
  const greenEnd = 360;

  return (
    <div style={{ position: "relative", width: `${W}px`, height: `${H}px`, flexShrink: 0, marginBottom: "16px" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
        <polygon points={`${darkStart},0 ${W},0 ${W},${H} ${darkEnd},${H}`} fill="#2d2d2d" />
        <polygon points={`${greenStart},0 ${darkStart},0 ${darkEnd},${H} ${greenEnd},${H}`} fill="#00c853" />
        <rect x="0" y={H - barH} width={W} height={barH} fill="#00c853" />
      </svg>
      <div style={{ position: "absolute", zIndex: 10, top: "0", left: "24px", bottom: `${barH}px`, width: "324px", display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "12px 14px" }}>
        <div style={{ width: "100%", height: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "hsl(190 100% 13%)", borderRadius: "8px" }}><span style={{ color: "white", fontSize: "24px", fontWeight: "bold" }}>SICOOB</span></div>
      </div>
      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", color: "#ffffff", top: "50%", right: "32px", transform: "translateY(-60%)" }}>
        <p style={{ fontFamily: MONTSERRAT, fontWeight: 900, fontSize: "28px", textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 8px 0", lineHeight: 1, whiteSpace: "nowrap" }}>Proposta Comercial</p>
        <p style={{ fontSize: "13px", opacity: 0.95, fontWeight: 400, lineHeight: "1.8", margin: 0, fontVariantNumeric: "tabular-nums", fontFamily: MONTSERRAT }}>Nº&nbsp;{(data.quoteNumber || "").replace(/\s+/g, "")} • {data.date}</p>
        {data.validUntil && (
          <p style={{ fontSize: "12px", opacity: 0.75, fontWeight: 400, lineHeight: "1.6", marginTop: "2px", fontFamily: MONTSERRAT }}>Válida até {data.validUntil}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Client Bar ─── */
export function ClientBar({ company, contact, cnpj }: { company: string; contact: string; cnpj?: string }) {
  return (
    <div style={{ backgroundColor: "#f5f5f5", borderLeft: `6px solid ${GREEN}`, padding: "20px 25px", display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
      <div>
        <div style={{ fontFamily: MONTSERRAT, fontWeight: 700, fontSize: "12px", color: GREEN, textTransform: "uppercase", margin: "0 0 5px 0" }}>Empresa</div>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{company}</div>
        {cnpj && <div style={{ fontSize: "11px", color: "#666", marginTop: "3px", fontWeight: 700 }}>CNPJ: {cnpj}</div>}
      </div>
      {contact && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONTSERRAT, fontWeight: 700, fontSize: "12px", color: GREEN, textTransform: "uppercase", margin: "0 0 5px 0" }}>Solicitante</div>
          <div style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{contact}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Product Row ─── */
type ProposalPersonalization = NonNullable<ProposalItem["personalizations"]>[number];

function personalizationDimensions(personalization: ProposalPersonalization) {
  if (personalization.width_cm && personalization.height_cm) return { width: personalization.width_cm, height: personalization.height_cm };
  const dimensions = personalization.notes?.match(/\|\s*([\d.]+)×([\d.]+)cm/);
  const width = dimensions?.[1];
  const height = dimensions?.[2];
  if (!width || !height) return { width: personalization.width_cm, height: personalization.height_cm };
  return { width: parseFloat(width), height: parseFloat(height) };
}

function describePersonalization(personalization: ProposalPersonalization) {
    let description = personalization.technique_name;
    const { width, height } = personalizationDimensions(personalization);
    if (width && height) description += ` ${width}×${height}cm`;
    if (personalization.colors_count) description += ` | ${personalization.colors_count} cor${personalization.colors_count > 1 ? "es" : ""}`;
    if (personalization.material) description += ` | ${personalization.material}`;
    return description;
}

function personalizationDescription(item: ProposalItem) {
  return item.personalizations?.map(describePersonalization).join(" · ") ?? "";
}

function ProductCode({ item }: { item: ProposalItem }) {
  const code = item.composedCode ?? item.sku;
  if (!code) return null;
  const background = item.colorHex ?? "#2e7d32";
  const hex = background.replace("#", "");
  const luminance = (0.299 * parseInt(hex.substring(0, 2), 16) + 0.587 * parseInt(hex.substring(2, 4), 16) + 0.114 * parseInt(hex.substring(4, 6), 16)) / 255;
  return <span style={{ display: "inline-block", background, color: luminance > 0.5 ? "#1a1a1a" : "#ffffff", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "'Roboto Mono', monospace", whiteSpace: "nowrap", marginBottom: "4px" }}>{code}</span>;
}

function ProductDetails({ item, engraving }: { item: ProposalItem; engraving: string }) {
  return <td style={{ ...tdStyle, verticalAlign: "top" }}><span style={{ fontWeight: 800, color: "#000", fontSize: "16px", display: "block", marginBottom: "6px" }}>{item.name}</span><ProductCode item={item} />{item.description ? <span style={{ display: "block", fontSize: "13px", color: "#555", marginTop: "6px", lineHeight: "1.5", maxWidth: "450px" }}>{item.description}</span> : null}{engraving ? <span style={{ display: "block", fontSize: "13px", color: "#555", marginTop: "4px", lineHeight: "1.5" }}>Gravação: {engraving}</span> : null}{!engraving && item.color ? <span style={{ display: "block", fontSize: "13px", color: "#555", marginTop: "4px" }}>Cor: {item.color}{item.size ? ` | Tam: ${item.size}` : null}</span> : null}{!item.color && item.size ? <span style={{ display: "block", fontSize: "13px", color: "#555", marginTop: "4px" }}>Tam: {item.size}</span> : null}{item.gender ? <span style={{ display: "block", fontSize: "11px", color: "#888", marginTop: "2px" }}>Gênero: {item.gender}</span> : null}</td>;
}

export function ProductRow({ item }: { item: ProposalItem }) {
  const persUnitCost = item.personalizations?.reduce((sum, p) => {
    const pTotal = p.total_cost || 0;
    return sum + (item.quantity > 0 ? Math.round((pTotal / item.quantity) * 100) / 100 : 0);
  }, 0) || 0;
  const allInUnitPrice = item.unitPrice + persUnitCost;
  const itemDiscount = item.discount || 0;
  const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;

  const gravacao = personalizationDescription(item);

  return (
    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
      <td style={{ ...tdStyle, textAlign: "center", padding: "20px 8px", width: "90px" }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} crossOrigin="anonymous" style={{ width: "80px", height: "80px", objectFit: "contain", borderRadius: "6px", border: LIGHT_BORDER, backgroundColor: "#fff", padding: "4px" }} loading="lazy" />
        ) : (
          <div style={{ width: "80px", height: "80px", backgroundColor: "#f5f5f5", borderRadius: "6px", border: LIGHT_BORDER, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <span style={{ fontSize: "9px", color: "#bbb" }}>—</span>
          </div>
        )}
      </td>
      <ProductDetails item={item} engraving={gravacao} />
      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: "15px" }}>{item.quantity}</td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <span style={{ fontSize: "15px", fontWeight: 500 }}>{fmt(allInUnitPrice)}</span>
        {itemDiscount > 0 && <span style={{ display: "block", fontSize: "12px", color: "#888", marginTop: "4px" }}>(Desc: {fmt(itemDiscount)})</span>}
      </td>
      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontSize: "16px", color: DARK }}>{fmt(total)}</td>
    </tr>
  );
}

/* ─── Products Table ─── */
export function ProductsTable({ items }: { items: ProposalItem[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "center", width: "90px" }}>Foto</th>
          <th style={{ ...thStyle, textAlign: "left" }}>Descrição do Produto</th>
          <th style={{ ...thStyle, textAlign: "center", width: "55px" }}>Qtd.</th>
          <th style={{ ...thStyle, textAlign: "right", width: "100px" }}>Unitário</th>
          <th style={{ ...thStyle, textAlign: "right", width: "110px" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => <ProductRow key={idx} item={item} />)}
      </tbody>
    </table>
  );
}

/* ─── Totals ─── */
export function TotalsSection({ data }: { data: ProposalTemplateData }) {
  const shippingLabel = data.shippingType ? formatShipping(data.shippingType, data.shippingCost) : (data.shippingCost ? fmt(data.shippingCost) : "Cortesia");
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
      <div style={{ width: "380px" }}>
        <div style={totalsRowStyle}><span>Subtotal:</span><span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span></div>
        {data.discount && data.discount > 0 && <div style={totalsRowStyle}><span>Desconto Global:</span><span style={{ fontWeight: 500 }}>- {fmt(data.discount)}</span></div>}
        <div style={totalsRowStyle}><span>Frete:</span><span style={{ fontWeight: 500 }}>{shippingLabel}</span></div>
        <div style={{ backgroundColor: GREEN, color: "#fff", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px", borderRadius: "6px", boxShadow: "0 4px 10px rgba(0,200,83, 0.2)" }}>
          <span style={{ fontFamily: MONTSERRAT, fontWeight: 700, textTransform: "uppercase", fontSize: "15px" }}>Valor Total:</span>
          <strong style={{ fontFamily: MONTSERRAT, fontWeight: 800, fontSize: "24px" }}>{fmt(data.total)}</strong>
        </div>
      </div>
    </div>
  );
}

/* ─── Notes ─── */
export function NotesSection({ data }: { data: ProposalTemplateData }) {
  const paymentLabel = formatPaymentTerms(data.paymentTerms);
  const deliveryLabel = formatDeliveryTime(data.deliveryTime);
  const shippingLabel = formatShipping(data.shippingType, data.shippingCost);
  return (
    <div style={{ marginTop: "50px", fontSize: "12px", color: "#666", lineHeight: "1.6", borderTop: LIGHT_BORDER, paddingTop: "20px" }}>
      <div style={{ fontWeight: 700, fontSize: "13px", color: "#333", marginBottom: "8px" }}>Informações Relevantes:</div>
      <div>- Todos os valores são para produtos já personalizados conforme descrição.</div>
      {paymentLabel && <div>- 💳 Pagamento: {paymentLabel}.</div>}
      {deliveryLabel && <div>- 📦 Prazo de Entrega: {deliveryLabel}.</div>}
      {data.shippingType && <div>- 🚚 Frete: {shippingLabel}.</div>}
      <div>- Todos produtos passam por controle de qualidade.</div>
      {data.validUntil && <div>- 📅 Validade da Proposta: {data.validUntil}.</div>}
    </div>
  );
}

/* ─── Footer ─── */
function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#333" }}>
      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

export function FooterSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ position: "relative", width: "794px", height: "180px", marginTop: "auto" }}>
      <svg width="794" height="180" viewBox="0 0 794 180" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="370,180 395,20 425,20 400,180" fill="#e0e0e0" />
        <polygon points="395,180 420,20 460,20 435,180" fill={GREEN} />
        <polygon points="455,60 794,60 794,130 425,130" fill={DARK} />
        <rect x="480" y="130" width="314" height="50" fill={GREEN} />
        <polygon points="480,130 505,130 480,165" fill={GREEN_DARK} />
      </svg>
      <div style={{ position: "relative", zIndex: 10, padding: "0 50px", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "15px", paddingTop: "10px" }}>
          <ContactDot color={DARK} text="(11) 4637-5517" />
          <ContactDot color={GREEN} text="www.promobrindes.com.br" />
        </div>
        <div style={{ fontFamily: MONTSERRAT, fontSize: "16px", fontWeight: 700, color: BLUE, fontStyle: "italic", marginTop: "8px" }}>adm01@promobrindes.com.br</div>
        <div style={{ position: "absolute", top: "10px", right: "50px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Sacramento', cursive", fontSize: "34px", color: BLUE, marginBottom: "-5px", transform: "rotate(-3deg)" }}>{data.seller.name}</div>
          <div style={{ fontWeight: 800, fontSize: "12px", textTransform: "uppercase", marginTop: "5px", color: "#000" }}>{data.seller.name}</div>
          <div style={{ width: "180px", height: "1px", backgroundColor: "#333", margin: "2px auto" }} />
          <div style={{ fontSize: "11px", color: "#666" }}>Executivo de Vendas</div>
        </div>
      </div>
    </div>
  );
}
