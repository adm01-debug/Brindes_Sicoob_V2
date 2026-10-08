import React, { useEffect, useState } from "react";
import type { ProposalItem } from "../ProposalHtmlTemplate";
import { processLogoTransparent } from "./LogoWithTransparentBg";

function ProductImageTransparent({ src, alt }: { src: string; alt: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    processLogoTransparent(src).then(setDataUrl);
  }, [src]);
  return (
    <div style={{
      width: "92px",
      height: "92px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
      padding: "0px",
      boxSizing: "border-box",
    }}>
      <img
        src={dataUrl || src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }} loading="lazy" />
    </div>
  );
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const thBase: React.CSSProperties = {
  backgroundColor: "#00c853",
  color: "#fff",
  padding: "10px 10px",
  fontSize: "11px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

interface Props {
  items: ProposalItem[];
  showHeader?: boolean;
  startIndex?: number;
  options?: {
    hidePrices?: boolean;
    hidePhotos?: boolean;
  };
}

function ProposalTableCode({ item }: { item: ProposalItem }) {
  const code = item.composedCode ?? item.sku;
  if (!code) return null;
  const background = item.colorHex ?? "#2e7d32";
  const hex = background.replace("#", "");
  const luminance = (0.299 * parseInt(hex.substring(0, 2), 16) + 0.587 * parseInt(hex.substring(2, 4), 16) + 0.114 * parseInt(hex.substring(4, 6), 16)) / 255;
  return <div style={{ display: "block", marginBottom: "4px" }}><span style={{ display: "inline-block", background, color: luminance > 0.5 ? "#1a1a1a" : "#ffffff", fontSize: "9px", padding: "2px 7px", borderRadius: "3px", fontWeight: 700, fontFamily: "'Roboto', sans-serif", whiteSpace: "nowrap", border: luminance > 0.85 ? "1px solid #ccc" : "1px solid transparent" }}>{code}</span></div>;
}

function ProposalTableImage({ item, visible }: { item: ProposalItem; visible: boolean }) {
  if (!visible) return null;
  return <td style={{ padding: "1px", textAlign: "center", verticalAlign: "middle" }}>{item.imageUrl ? <ProductImageTransparent src={item.imageUrl} alt={item.name} /> : <div style={{ width: "92px", height: "92px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxSizing: "border-box" }}><span style={{ fontSize: "9px", color: "#ccc" }}>—</span></div>}</td>;
}

function ProposalTableDescription({ item, engraving }: { item: ProposalItem; engraving: string }) {
  return <td style={{ padding: "8px 10px", verticalAlign: "middle" }}><ProposalTableCode item={item} /><div style={{ fontWeight: 800, color: "#111", fontSize: "13px", lineHeight: "1.3", marginBottom: "2px" }}>{item.name}</div>{item.description ? <span style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px", lineHeight: "1.4", maxWidth: "380px" }}>{item.description}</span> : null}{engraving ? <table style={{ borderCollapse: "collapse", marginTop: "2px" }}><tbody><tr><td style={{ width: "3px", backgroundColor: "#00796b", padding: 0 }} /><td style={{ backgroundColor: "#e0f2f1", padding: "3px 7px", borderRadius: "0 4px 4px 0" }}><span style={{ fontSize: "10px", color: "#00796b", fontWeight: 700 }}>✦ Gravação: </span><span style={{ fontSize: "10px", color: "#00796b", fontWeight: 500 }}>{engraving}</span></td></tr></tbody></table> : null}{!engraving && item.color ? <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>Cor: {item.color}</span> : null}</td>;
}

function ProposalTablePrice({ hidden, unitPrice, discount }: { hidden: boolean | undefined; unitPrice: number; discount: number }) {
  return <td style={{ padding: "8px 8px", textAlign: "right", verticalAlign: "middle", fontVariantNumeric: "tabular-nums" }}>{hidden ? null : <><span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{fmt(unitPrice)}</span>{discount > 0 ? <span style={{ display: "block", fontSize: "10px", color: "#e53935", marginTop: "2px", fontWeight: 600 }}>-{fmt(discount)}</span> : null}</>}</td>;
}

type ProposalPersonalization = NonNullable<ProposalItem['personalizations']>[number];

function personalizationDimensions(personalization: ProposalPersonalization) {
  const current = { width: personalization.width_cm, height: personalization.height_cm };
  if (current.width && current.height) return current;
  const match = personalization.notes?.match(/\|\s*([\d.]+)×([\d.]+)cm/);
  if (!match) return current;
  return {
    width: current.width || parseFloat(match[1] || "0"),
    height: current.height || parseFloat(match[2] || "0"),
  };
}

function dimensionDescription(width: number | null | undefined, height: number | null | undefined) {
  if (!width || !height) return "";
  return ` ${width}×${height}cm`;
}

function colorDescription(count: number | null | undefined) {
  if (!count) return "";
  return ` | ${count} cor${count > 1 ? "es" : ""}`;
}

function personalizationDescription(personalization: ProposalPersonalization) {
  const { width, height } = personalizationDimensions(personalization);
  const material = personalization.material ? ` | ${personalization.material}` : "";
  return personalization.technique_name
    + dimensionDescription(width, height)
    + colorDescription(personalization.colors_count)
    + material;
}

export function ProposalProductTable({ items, showHeader = true, startIndex = 0, options = {} }: Props) {
  const hasAnyImage = !options.hidePhotos && items.some((item) => !!item.imageUrl);

  // Group items by kit_group_id
  const groups: { kitName: string | null; items: { item: ProposalItem; globalIdx: number }[] }[] = [];
  let currentGroupId: string | null | undefined = undefined;

  items.forEach((item, idx) => {
    const gid = item.kit_group_id || null;
    if (gid !== currentGroupId || gid === null) {
      groups.push({ kitName: gid ? (item.kit_name || "Kit") : null, items: [] });
      currentGroupId = gid;
    }
    groups[groups.length - 1]?.items.push({ item, globalIdx: startIndex + idx });
  });

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      {showHeader && (
        <thead>
          <tr>
            {hasAnyImage && (
              <th style={{ ...thBase, textAlign: "center", width: "110px", borderRadius: "6px 0 0 0" }}>Foto</th>
            )}
            <th style={{ ...thBase, textAlign: "left", borderRadius: hasAnyImage ? "0" : "6px 0 0 0" }}>Descrição do Produto</th>
            <th style={{ ...thBase, textAlign: "center", width: "52px" }}>Qtd.</th>
            {!options.hidePrices && (
              <th style={{ ...thBase, textAlign: "right", width: "90px", borderRadius: "0 6px 0 0" }}>Unitário</th>
            )}
            {options.hidePrices && (
              <th style={{ ...thBase, textAlign: "right", width: "20px", borderRadius: "0 6px 0 0" }}></th>
            )}
          </tr>
        </thead>
      )}
      <tbody>
        {groups.map((group, gIdx) => (
          <React.Fragment key={gIdx}>
            {group.kitName && (
              <tr>
                <td
                  colSpan={hasAnyImage ? 4 : 3}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#e8f5e9",
                    borderBottom: "2px solid #00c853",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#2e7d32",
                    fontFamily: "'Montserrat', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  📦 Kit: {group.kitName}
                  <span style={{ fontWeight: 400, fontSize: "10px", marginLeft: "8px", color: "#666" }}>
                    ({group.items.length} {group.items.length === 1 ? "item" : "itens"})
                  </span>
                </td>
              </tr>
            )}
            {group.items.map(({ item, globalIdx }, idx) => {
              const persUnitCost = item.personalizations?.reduce((sum, p) => {
                const pTotal = p.total_cost || 0;
                return sum + (item.quantity > 0 ? Math.round((pTotal / item.quantity) * 100) / 100 : 0);
              }, 0) || 0;
              const allInUnitPrice = item.unitPrice + persUnitCost;
              const itemDiscount = item.discount || 0;
              const isEven = globalIdx % 2 === 0;

              const gravacao = item.personalizations?.map(personalizationDescription).join(" · ");

              return (
                <tr key={idx} style={{
                  backgroundColor: isEven ? "#ffffff" : "#f9fafb",
                  borderBottom: "1px solid #eef0f2",
                }}>
                  <ProposalTableImage item={item} visible={hasAnyImage} />
                  <ProposalTableDescription item={item} engraving={gravacao ?? ""} />
                  <td style={{ padding: "8px 6px", textAlign: "center", verticalAlign: "middle", fontWeight: 800, fontSize: "14px", color: "#222", fontVariantNumeric: "tabular-nums" }}>
                    {item.quantity}
                  </td>
                  <ProposalTablePrice hidden={options.hidePrices} unitPrice={allInUnitPrice} discount={itemDiscount} />
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
