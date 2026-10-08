/**
 * whitelabel-comparison (C6 #3) — Gera PDF white-label com branding do cliente vinculado.
 * Busca nome e logo do cliente no CRM externo; cai para genérico se ausente.
 */
import { selectCrmById } from "@/lib/crm-db";
import type { CrmCompany } from "@/types/crm";
import type { jsPDF } from "jspdf";

export interface ClientBranding {
  name: string | null;
  logoUrl: string | null;
  brandColor: string | null;
}

export async function fetchClientBranding(clientId: string | null): Promise<ClientBranding | null> {
  if (!clientId) return null;
  try {
    const company = await selectCrmById<Pick<CrmCompany, "razao_social" | "nome_fantasia" | "title" | "logo_url">>(
      "companies", clientId, "razao_social,nome_fantasia,title,logo_url"
    );
    if (!company) return null;
    return {
      name: company.title || company.nome_fantasia || company.razao_social,
      logoUrl: company.logo_url,
      brandColor: null,
    };
  } catch { return null; }
}

async function addClientLogo(pdf: jsPDF, branding: ClientBranding | null, pageWidth: number) {
  if (!branding?.logoUrl) return;
  try {
    const logoData = await fetchImageAsDataUrl(branding.logoUrl);
    if (logoData) pdf.addImage(logoData, "PNG", pageWidth - 50, 2, 18, 10);
  } catch {
    // O logo é opcional e não impede a exportação.
  }
}

function addComparisonImage(
  pdf: jsPDF,
  imageData: string,
  imageWidth: number,
  ...dimensions: [imageHeight: number, pageHeight: number]
) {
  const [imageHeight, pageHeight] = dimensions;
  if (imageHeight < pageHeight - 25) {
    pdf.addImage(imageData, "PNG", 10, 20, imageWidth, imageHeight);
    return;
  }
  let position = 20;
  let remaining = imageHeight;
  const sliceHeight = pageHeight - 25;
  while (remaining > 0) {
    pdf.addImage(imageData, "PNG", 10, position - (imageHeight - remaining), imageWidth, imageHeight);
    remaining -= sliceHeight;
    if (remaining > 0) { pdf.addPage(); position = 10; }
  }
}

export async function exportWhitelabelComparisonPDF(opts: {
  targetSelector: string;
  clientId: string | null;
  fileName?: string;
}): Promise<void> {
  const { targetSelector, clientId } = opts;
  const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasMod.default;
  const el = document.querySelector(targetSelector) as HTMLElement | null;
  if (!el) throw new Error("Área de exportação não encontrada");

  const branding = await fetchClientBranding(clientId);
  const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header bar
  const accent = branding?.brandColor ?? "#0f172a";
  const [r, g, b] = hexToRgb(accent);
  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, pageWidth, 14, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.text(
    branding?.name ? `Comparação de Produtos — ${branding.name}` : "Comparação de Produtos — Brindes Sicoob",
    10, 9
  );
  pdf.setFontSize(8);
  pdf.text(new Date().toLocaleDateString("pt-BR"), pageWidth - 30, 9);

  // Logo do cliente (se houver)
  await addClientLogo(pdf, branding, pageWidth);

  pdf.setTextColor(0, 0, 0);
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  addComparisonImage(pdf, imgData, imgWidth, imgHeight, pageHeight);
  pdf.save(opts.fileName ?? `comparacao-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return [15, 23, 42];
  const [r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return [15, 23, 42];
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}
