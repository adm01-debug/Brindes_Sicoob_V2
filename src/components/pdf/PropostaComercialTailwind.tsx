import React, { forwardRef } from "react";
import type { ProposalTemplateData, ProposalItem } from "./ProposalHtmlTemplate";
import { ProposalHeader } from "./proposal/ProposalHeader";
import { ProposalClientBar } from "./proposal/ProposalClientBar";
import { ProposalProductTable } from "./proposal/ProposalProductTable";
import { ProposalTotals } from "./proposal/ProposalTotals";
import { ProposalNotes } from "./proposal/ProposalNotes";
import { ProposalSellerSignature } from "./proposal/ProposalSellerSignature";
import { ProposalFooter } from "./proposal/ProposalFooter";
import { ProposalClientSignature } from "./proposal/ProposalClientSignature";

/* Compact client bar for continuation pages */
function ProposalClientBarCompact({ data }: { data: ProposalTemplateData }) {
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || "";
  return (
    <div style={{
      padding: "6px 12px",
      marginTop: "6px",
      marginBottom: "8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #e0e0e0",
      fontSize: "11px",
      color: "#666",
    }}>
      <span><strong style={{ color: "#333" }}>{company}</strong>{data.client.cnpj ? ` — CNPJ: ${data.client.cnpj}` : ""}</span>
      {contact && <span>Solicitante: <strong style={{ color: "#333" }}>{contact}</strong></span>}
    </div>
  );
}

const PAGE_W = 794;
const PAGE_H = 1123;
const FIRST_HEADER_H = 128;
const CONT_HEADER_H = 60;
const CONT_CLIENT_H = 60;  // last page: totals + signature + notes + green bar
const SIMPLE_FOOTER_H = 30; // page number + green bar only
const NOTES_FOOTER_H = 230; // notes block (conditions + terms) on every page
const CONTENT_PAD = 36;
const CLIENT_BAR_H = 90;
const TOTALS_H = 180;
const NOTES_H = 310; // condições comerciais + aceite do cliente + assinatura vendedor
const TABLE_HEADER_H = 38;
const ROW_H = 76; // estimated row height
type ProposalOptions = { hidePrices?: boolean; hidePhotos?: boolean; hideTotals?: boolean };

function ProposalWatermark({ draft, status }: { draft: boolean; status: ProposalTemplateData["status"] }) {
  if (!draft && status !== "expired") return null;
  const expired = status === "expired";
  return <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-35deg)", fontSize: "80px", fontWeight: 900, color: expired ? "rgba(255, 0, 0, 0.09)" : "rgba(200, 0, 0, 0.07)", letterSpacing: "0.3em", textTransform: "uppercase", pointerEvents: "none", zIndex: 5, userSelect: "none" }}>{expired ? "EXPIRADO" : "RASCUNHO"}</div>;
}

function ProposalPageClient({ first, data }: { first: boolean; data: ProposalTemplateData }) {
  return first ? <ProposalClientBar data={data} /> : <ProposalClientBarCompact data={data} />;
}

function ProposalPageTotals({ last, hidden, data }: { last: boolean; hidden: boolean | undefined; data: ProposalTemplateData }) {
  if (!last || hidden) return null;
  return <><ProposalTotals data={data} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><ProposalSellerSignature data={data} /><ProposalClientSignature data={data} /></div></>;
}

function ProposalPage({ items, pageIndex, totalPages, startIndex, data, draft, options }: { items: ProposalItem[]; pageIndex: number; totalPages: number; startIndex: number; data: ProposalTemplateData; draft: boolean; options: ProposalOptions }) {
  const first = pageIndex === 0;
  const last = pageIndex === totalPages - 1;
  return <div className="proposal-page" style={{ width: `${PAGE_W}px`, height: `${PAGE_H}px`, backgroundColor: "#fff", fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif", color: "#333", position: "relative", boxSizing: "border-box", overflow: "hidden", display: "flex", flexDirection: "column", pageBreakAfter: last ? "auto" : "always" }}><ProposalWatermark draft={draft} status={data.status} /><ProposalHeader data={data} isContinuation={!first} /><div style={{ padding: `0 ${CONTENT_PAD}px`, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}><ProposalPageClient first={first} data={data} />{items.length > 0 ? <ProposalProductTable items={items} showHeader={true} startIndex={startIndex} options={options} /> : null}<ProposalPageTotals last={last} hidden={options.hideTotals} data={data} /><div style={{ marginTop: "auto" }}><ProposalNotes data={data} /></div></div><ProposalFooter data={data} isLastPage={last} pageNumber={pageIndex + 1} totalPages={totalPages} /></div>;
}

function pagesWithOffsets(pages: ProposalItem[][]) {
  let startIndex = 0;
  return pages.map((items, pageIndex) => {
    const page = { items, pageIndex, startIndex };
    startIndex += items.length;
    return page;
  });
}

function paginateItems(items: ProposalItem[]) {
  // Every page now has notes in footer, so we always reserve NOTES_FOOTER_H
  // Single page: header + client + table + totals + signature + notes + footer bar
  const singlePageAvailable = PAGE_H - FIRST_HEADER_H - CLIENT_BAR_H - TABLE_HEADER_H - TOTALS_H - NOTES_H - NOTES_FOOTER_H - SIMPLE_FOOTER_H - 40;
  const singlePageRows = Math.max(0, Math.floor(singlePageAvailable / ROW_H));

  if (items.length <= singlePageRows && singlePageRows > 0) {
    return [items];
  }

  // Multi-page — every page reserves space for notes footer
  const pages: ProposalItem[][] = [];
  let remaining = [...items];

  // First page: products + notes footer + page bar (no totals/signature)
  const firstPageAvailable = PAGE_H - FIRST_HEADER_H - CLIENT_BAR_H - TABLE_HEADER_H - NOTES_FOOTER_H - SIMPLE_FOOTER_H - 30;
  const firstPageRows = Math.max(1, Math.floor(firstPageAvailable / ROW_H));

  const fpRows = Math.min(firstPageRows, remaining.length);
  pages.push(remaining.slice(0, fpRows));
  remaining = remaining.slice(fpRows);

  if (remaining.length === 0) {
    pages.push([]);
  }

  while (remaining.length > 0) {
    // Continuation pages: compact header + compact client + table + notes footer + page bar
    const contPageAvailable = PAGE_H - CONT_HEADER_H - CONT_CLIENT_H - TABLE_HEADER_H - NOTES_FOOTER_H - SIMPLE_FOOTER_H - 30;
    const contPageRows = Math.floor(contPageAvailable / ROW_H);

    if (remaining.length <= contPageRows) {
      // Check if last page can also fit totals + signature
      const spaceNeeded = remaining.length * ROW_H + TABLE_HEADER_H + TOTALS_H + NOTES_H + NOTES_FOOTER_H + SIMPLE_FOOTER_H + CONT_HEADER_H + CONT_CLIENT_H + 40;
      if (spaceNeeded <= PAGE_H) {
        pages.push(remaining);
        remaining = [];
      } else {
        const fitRows = Math.max(1, Math.floor(contPageAvailable / ROW_H));
        pages.push(remaining.slice(0, fitRows));
        remaining = remaining.slice(fitRows);
        if (remaining.length === 0) {
          pages.push([]);
        }
      }
    } else {
      pages.push(remaining.slice(0, contPageRows));
      remaining = remaining.slice(contPageRows);
    }
  }

  return pages;
}

export const PropostaComercialTailwind = forwardRef<HTMLDivElement, { 
  data: ProposalTemplateData; 
  isDraft?: boolean;
  options?: {
    hidePrices?: boolean;
    hidePhotos?: boolean;
    hideTotals?: boolean;
  }
}>(
  ({ data, isDraft = false, options = {} }, ref) => {
    const pages = paginateItems(data.items);
    const totalPages = pages.length;
    const indexedPages = pagesWithOffsets(pages);

    return (
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {indexedPages.map((page) => <ProposalPage key={page.pageIndex} items={page.items} pageIndex={page.pageIndex} totalPages={totalPages} startIndex={page.startIndex} data={data} draft={isDraft} options={options} />)}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&family=Sacramento&display=swap');
          @media print {
            body { background: white; }
            button { display: none; }
            @page { margin: 0; size: auto; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}</style>
      </div>
    );
  }
);

PropostaComercialTailwind.displayName = "PropostaComercialTailwind";

export default PropostaComercialTailwind;
