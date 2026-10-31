/**
 * Proposal PDF Generator v3 — HTML→PDF via html2canvas + jsPDF
 * 
 * Renders pixel-perfect HTML template offscreen (multi-page),
 * captures each page with html2canvas, and outputs as PDF.
 */

const getJsPDF = () => import("jspdf").then(m => m.jsPDF);
const getHtml2Canvas = () => import("html2canvas").then(m => m.default);
import React from "react";
import ReactDOM from "react-dom/client";
import { type ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import { PropostaComercialTailwind } from "@/components/pdf/PropostaComercialTailwind";

type PdfDocument = InstanceType<Awaited<ReturnType<typeof getJsPDF>>>;
type CanvasRenderer = Awaited<ReturnType<typeof getHtml2Canvas>>;

interface PdfOptions {
  isDraft?: boolean;
  hidePrices?: boolean;
  hidePhotos?: boolean;
  hideTotals?: boolean;
}

function renderProposal(
  root: ReactDOM.Root,
  templateRef: React.RefObject<HTMLDivElement | null>,
  data: ProposalTemplateData,
  options?: PdfOptions,
) {
  root.render(React.createElement(PropostaComercialTailwind, {
    data,
    ref: templateRef as React.Ref<HTMLDivElement>,
    isDraft: options?.isDraft || false,
    options: {
      hidePrices: options?.hidePrices,
      hidePhotos: options?.hidePhotos,
      hideTotals: options?.hideTotals,
    },
  }));
}

async function waitForRender(templateRef: React.RefObject<HTMLDivElement | null>) {
  const startedAt = Date.now();
  await new Promise<void>((resolve) => {
    const check = () => {
      if (templateRef.current || Date.now() - startedAt > 2000) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

async function waitForAssets(wrapper: HTMLElement) {
  const imagePromises = Array.from(wrapper.querySelectorAll("img")).map((image) => (
    new Promise<void>((resolve) => {
      if (image.complete) return resolve();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      setTimeout(resolve, 5000);
    })
  ));
  const fontPromise = document.fonts?.ready
    ? Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1000))])
    : new Promise((resolve) => setTimeout(resolve, 500));
  await Promise.all([...imagePromises, fontPromise]);
}

async function capturePages(
  pages: Element[],
  pdf: PdfDocument,
  html2canvas: CanvasRenderer,
  dimensions: { width: number; height: number },
) {
  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage();
    const canvas = await html2canvas(pages[index] as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      windowWidth: 794,
      imageTimeout: 5000,
    });
    const imageData = canvas.toDataURL("image/jpeg", 0.92);
    const imageHeight = (canvas.height * dimensions.width) / canvas.width;
    pdf.addImage(imageData, "JPEG", 0, 0, dimensions.width, Math.min(imageHeight, dimensions.height));
  }
}


export async function generateProposalPDFv2(data: ProposalTemplateData, options?: PdfOptions): Promise<Blob> {
  const [jsPDF, html2canvas] = await Promise.all([getJsPDF(), getHtml2Canvas()]);

  // ① Pre-process logo BEFORE React renders — guarantees cache is warm

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  try {
    const root = ReactDOM.createRoot(container);
    const templateRef = React.createRef<HTMLDivElement>();
    
    renderProposal(root, templateRef, data, options);
    await waitForRender(templateRef);

    const wrapper = templateRef.current || container.firstElementChild as HTMLElement;
    if (!wrapper) throw new Error("Failed to render proposal template");

    // Wait for all images + Google Fonts in parallel
    await waitForAssets(wrapper);

    // Find all page elements
    const pageElements = wrapper.querySelectorAll(".proposal-page");
    const pages = pageElements.length > 0 ? Array.from(pageElements) : [wrapper];

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // ── BUG FIX (html2canvas issue #2775) ────────────────────────────────────
    // Tailwind CSS Preflight define globalmente `img { display: block }`.
    // Durante a captura, html2canvas interpreta esse estilo como uma quebra de
    // linha fantasma após cada imagem, deslocando todo o texto subsequente para
    // baixo e desfigurando o layout do PDF (mesmo que o preview no browser
    // apareça corretamente, pois o browser compensa o offset internamente).
    //
    // Solução: injetar temporariamente `img { display: inline-block !important }`
    // apenas durante a captura do canvas, removendo a regra no bloco `finally`
    // para não afetar o restante da UI. Confirmado funcionando em 2026-02.
    // ─────────────────────────────────────────────────────────────────────────
    const imgFixStyle = document.createElement("style");
    imgFixStyle.textContent = "img { display: inline-block !important; }";
    document.head.appendChild(imgFixStyle);

    try {
      await capturePages(pages, pdf, html2canvas, { width: pdfWidth, height: pdfHeight });
    } finally {
      // Always remove the temporary style, even if html2canvas throws
      document.head.removeChild(imgFixStyle);
    }

    root.unmount();
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
