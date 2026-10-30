/**
 * mockupGenerationService — Handles mockup generation API calls and history persistence.
 * Extracted from useMockupGenerator to reduce hook complexity.
 */
import { supabase } from "@/integrations/supabase/client";
import { uploadLogoToStorage, downloadImageAsPdfFromUrl } from "@/lib/mockup-storage";
import { toast } from "sonner";
import type { PersonalizationArea } from "@/components/mockup/MultiAreaManager";

// ─── Types ───────────────────────────────────────────────────────────

export interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface GeneratedMockup {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  technique_id: string | null;
  technique_name: string;
  mockup_url: string;
  layout_url?: string | null;
  logo_url: string;
  position_x: number | null;
  position_y: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  location_name?: string | null;
  colors_count?: number | null;
  annotations?: Array<Record<string, unknown>> | null;
  client_name?: string | null;
  created_at: string;
  client_id: string | null;
}

// ─── Technique prompt mapping ────────────────────────────────────────

const TECHNIQUE_PROMPTS: Record<string, string> = {
  bordado: "as professional machine embroidery with visible thread stitching texture",
  silk: "as screen printed with flat solid colors, matte finish",
  dtf: "as DTF printed transfer with vibrant colors, slight glossy finish",
  laser: "as laser engraved, etched into the material surface, monochromatic",
  laser_co2: "as CO2 laser engraved with precise etching on organic materials",
  laser_fibra: "as fiber laser marked on metal with high-contrast permanent mark",
  sublimacao: "as sublimation printed, colors absorbed seamlessly into the material",
  tampografia: "as pad printed with slightly glossy ink, precise small details",
  hot_stamping: "as hot stamped with metallic foil finish, shiny reflective surface",
  adesivo: "as vinyl sticker/decal applied to surface",
  uv: "as UV printed with raised ink texture, vibrant colors",
  transfer: "as heat transfer vinyl, smooth finish with slight sheen",
  default: "as professionally printed/applied logo",
};

export function getTechniquePrompt(technique: Technique): string {
  const code = technique.code?.toLowerCase() || technique.name.toLowerCase();
  for (const [key, prompt] of Object.entries(TECHNIQUE_PROMPTS)) {
    if (code.includes(key) || technique.name.toLowerCase().includes(key)) return prompt;
  }
  return TECHNIQUE_PROMPTS.default ?? "as professionally printed/applied logo";
}

// ─── History fetching ────────────────────────────────────────────────

export async function fetchMockupHistory(userId?: string): Promise<GeneratedMockup[]> {
  let query = supabase
    .from("generated_mockups")
    .select(`id, product_id, product_name, product_sku, technique_id, technique_name, mockup_url, layout_url, logo_url, position_x, position_y, logo_width_cm, logo_height_cm, location_name, colors_count, created_at, client_id, client_name, annotations`)
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("seller_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    product_sku: row.product_sku ?? null,
    technique_id: row.technique_id ?? null,
    technique_name: row.technique_name ?? "",
    layout_url: row.layout_url ?? null,
    location_name: row.location_name ?? null,
    colors_count: row.colors_count ?? null,
    client_id: row.client_id ?? null,
    client_name: row.client_name ?? null,
    annotations: (row.annotations as Array<Record<string, unknown>> | null) ?? null,
  })) as GeneratedMockup[];
}

// ─── Save to history ─────────────────────────────────────────────────

export interface SaveMockupParams {
  userId: string;
  product: { id: string; name: string; sku?: string | null };
  technique: Technique;
  client: { id?: string; name?: string; nome_fantasia?: string; razao_social?: string } | null;
  area: PersonalizationArea;
  mockupUrl: string;
  annotations?: { id: string; x: number; y: number; text: string }[];
  extra?: { layoutUrl?: string; locationName?: string; colorsCount?: number };
}

function valueOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

async function storedLogoUrl(params: SaveMockupParams): Promise<string> {
  const preview = valueOr(params.area.logoPreview, "");
  if (!preview.startsWith("data:")) return preview;
  const uploaded = await uploadLogoToStorage(
    params.userId,
    preview,
    `${valueOr(params.product.sku, "product")}-${valueOr(params.technique.code, "tech")}`,
  );
  return valueOr(uploaded, "");
}

function clientIdentity(client: SaveMockupParams["client"]): { id: string | null; name: string | null } {
  if (!client) return { id: null, name: null };
  return {
    id: valueOr(client.id, null),
    name: valueOr(client.nome_fantasia, valueOr(client.razao_social, valueOr(client.name, null))),
  };
}

function savedAnnotations(annotations: SaveMockupParams["annotations"]) {
  return annotations?.length ? annotations : null;
}

export async function saveMockupToDb(params: SaveMockupParams): Promise<string | null> {
  const { userId, product, technique, client, area, mockupUrl, annotations, extra } = params;

  try {
    const logoUrl = await storedLogoUrl(params);
    const clientData = clientIdentity(client);

    const { data: insertedRow, error } = await supabase.from("generated_mockups").insert({
      seller_id: userId,
      client_id: clientData.id,
      client_name: clientData.name,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku ?? null,
      technique_id: technique.id,
      technique_name: technique.name,
      logo_url: logoUrl,
      mockup_url: mockupUrl,
      layout_url: valueOr(extra?.layoutUrl, null),
      position_x: area.positionX,
      position_y: area.positionY,
      logo_width_cm: area.logoWidth,
      logo_height_cm: area.logoHeight,
      location_name: valueOr(extra?.locationName, valueOr(area.name, null)),
      colors_count: valueOr(extra?.colorsCount, null),
      annotations: savedAnnotations(annotations),
    }).select("id").single();

    if (error) throw error;
    return insertedRow?.id || null;
  } catch (error) {
    console.error("Error saving to history:", error);
    return null;
  }
}

// ─── Generate mockup ─────────────────────────────────────────────────

export interface GenerateMockupParams {
  productImage: string;
  productName: string;
  technique: Technique;
  areas: PersonalizationArea[];
}

export interface GenerateMockupResult {
  singleUrl: string | null;
  batchResults: { areaName: string; url: string }[];
}

function mockupAreaPayload(area: PersonalizationArea) {
  return {
    name: area.name,
    positionX: area.positionX,
    positionY: area.positionY,
    logoWidth: area.logoWidth,
    logoHeight: area.logoHeight,
    logoRotation: valueOr(area.logoRotation, 0),
    logoScale: valueOr(area.logoScale, 100),
  };
}

function mockupRequestBody(
  params: GenerateMockupParams,
  area: PersonalizationArea,
  techniquePrompt: string,
  includeAllAreas: boolean,
) {
  const logoIsUrl = Boolean(area.logoPreview?.startsWith("http"));
  const requestAreas = includeAllAreas
    ? params.areas.filter((candidate) => candidate.logoPreview)
    : [area];
  return {
    productImageUrl: params.productImage,
    logoBase64: logoIsUrl ? undefined : area.logoPreview,
    logoUrl: logoIsUrl ? area.logoPreview : undefined,
    techniqueName: params.technique.name,
    techniquePrompt,
    positionX: area.positionX,
    positionY: area.positionY,
    logoWidthCm: area.logoWidth,
    logoHeightCm: area.logoHeight,
    logoRotation: valueOr(area.logoRotation, 0),
    logoScale: valueOr(area.logoScale, 100),
    productName: params.productName,
    areas: requestAreas.map(mockupAreaPayload),
  };
}

function mockupUrlFromResponse(response: unknown): string {
  const result = response as {
    data?: { mockupUrl?: string; errorCode?: string; error?: string } | null;
    error?: unknown;
  };
  if (result.error) {
    if (result.data?.errorCode === "SVG_NOT_SUPPORTED") {
      throw new Error(result.data.error || "Logos SVG não são suportados. Use PNG ou JPG.");
    }
    throw result.error;
  }
  if (!result.data?.mockupUrl) throw new Error("Nenhuma imagem retornada");
  return result.data.mockupUrl;
}

async function generateAreaMockup(
  params: GenerateMockupParams,
  area: PersonalizationArea,
  techniquePrompt: string,
  includeAllAreas: boolean,
): Promise<string> {
  const response = await supabase.functions.invoke("generate-mockup", {
    body: mockupRequestBody(params, area, techniquePrompt, includeAllAreas),
  });
  return mockupUrlFromResponse(response);
}

async function generateBatchMockups(
  params: GenerateMockupParams,
  areas: PersonalizationArea[],
  techniquePrompt: string,
): Promise<GenerateMockupResult> {
  const results: { areaName: string; url: string }[] = [];
  for (const area of areas) {
    toast.info(`Gerando ${area.name}...`, { duration: 2000 });
    try {
      results.push({ areaName: area.name, url: await generateAreaMockup(params, area, techniquePrompt, false) });
    } catch (error) {
      console.error(`Error generating ${area.name}:`, error);
    }
  }
  const first = results[0];
  if (!first) throw new Error("Nenhum mockup gerado no batch");
  return { singleUrl: first.url, batchResults: results };
}

export async function generateMockupApi(params: GenerateMockupParams): Promise<GenerateMockupResult> {
  const { technique, areas } = params;
  const areasWithLogos = areas.filter(a => a.logoPreview);
  const techniquePrompt = getTechniquePrompt(technique);

  if (areasWithLogos.length === 1) {
    const area = areasWithLogos[0];
    if (!area) throw new Error("Nenhuma área com logo encontrada");
    return { singleUrl: await generateAreaMockup(params, area, techniquePrompt, true), batchResults: [] };
  }
  return generateBatchMockups(params, areasWithLogos, techniquePrompt);
}

// ─── Download ────────────────────────────────────────────────────────

export async function downloadMockupAsPdf(mockupUrl: string, sku?: string, techniqueName?: string) {
  const safeSku = (sku || "produto").replace(/[^a-zA-Z0-9-_]/g, "-");
  const safeTechnique = (techniqueName || "tecnica").replace(/[^a-zA-Z0-9-_]/g, "-");
  const fileName = `mockup-${safeSku}-${safeTechnique}.pdf`;
  await downloadImageAsPdfFromUrl(mockupUrl, fileName);
}

// ─── Delete ──────────────────────────────────────────────────────────

export async function deleteMockupFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("generated_mockups").delete().eq("id", id);
  if (error) throw error;
}

// ─── Default area ────────────────────────────────────────────────────

export const createDefaultArea = (): PersonalizationArea => ({
  id: crypto.randomUUID(),
  name: "Frente",
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoRotation: 0,
  logoScale: 100,
  logoPreview: null,
});
