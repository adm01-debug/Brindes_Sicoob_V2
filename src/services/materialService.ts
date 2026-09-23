import { BaseHttpService } from "./infrastructure/BaseHttpService";
import { getSupabaseFunctionUrl } from "@/integrations/supabase/client";

// Tipos
export interface MaterialGroup {
  group_id: string;
  group_name: string;
  group_slug: string;
  group_description: string | null;
  group_hex_code: string | null;
  group_icon: string | null;
  display_order: number;
  total_materials: number;
  products_using: number;
}

export interface MaterialType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  properties: Record<string, any> | null;
  display_order: number;
  is_active: boolean;
  group_id: string;
  group_name?: string;
  group_slug?: string;
}

export interface MaterialComplete {
  type_id: string;
  type_name: string;
  type_slug: string;
  type_description: string | null;
  type_properties: Record<string, any> | null;
  type_display_order: number;
  group_id: string;
  group_name: string;
  group_slug: string;
  group_description: string | null;
  group_hex_code: string | null;
  group_icon: string | null;
  group_display_order: number;
}

// Service para chamadas à API de materiais
class MaterialService extends BaseHttpService {
  protected getBaseUrl(): string {
    return getSupabaseFunctionUrl('materials-api');
  }

  private async callAction<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    return this.post<T>({ action, ...params });
  }


  // Buscar todos os grupos de materiais com estatísticas
  async getGroups(): Promise<{ groups: MaterialGroup[]; count: number }> {
    const res = await this.callAction<{ groups: Record<string, unknown>[]; count?: number }>("groups");

    const groups: MaterialGroup[] = (res.groups || []).map((g) => ({
      group_id: (g.group_id as string | undefined) ?? (g.id as string | undefined) ?? "",
      group_name: (g.group_name as string | undefined) ?? (g.name as string | undefined) ?? "",
      group_slug: (g.group_slug as string | undefined) ?? (g.slug as string | undefined) ?? "",
      group_description: (g.group_description as string | null | undefined) ?? (g.description as string | null | undefined) ?? null,
      group_hex_code: (g.group_hex_code as string | null | undefined) ?? (g.hex_code as string | null | undefined) ?? null,
      group_icon: (g.group_icon as string | null | undefined) ?? (g.icon as string | null | undefined) ?? null,
      display_order: (g.display_order as number | undefined) ?? (g.sort_order as number | undefined) ?? 0,
      total_materials: (g.total_materials as number | undefined) ?? (g.materials_count as number | undefined) ?? 0,
      products_using: (g.products_using as number | undefined) ?? (g.products_count as number | undefined) ?? 0,
    }));

    return { groups, count: res.count ?? groups.length };
  }

  // Buscar todos os tipos de materiais
  async getTypes(): Promise<{ types: MaterialType[]; count: number }> {
    const res = await this.callAction<{ types: Record<string, unknown>[]; count?: number }>("types");

    const types: MaterialType[] = (res.types || []).map((t) => ({
      id: (t.id as string | undefined) ?? (t.material_id as string | undefined) ?? "",
      name: (t.name as string | undefined) ?? (t.material_name as string | undefined) ?? "",
      slug: (t.slug as string | undefined) ?? (t.material_slug as string | undefined) ?? "",
      description: (t.description as string | null | undefined) ?? (t.material_description as string | null | undefined) ?? null,
      properties: (t.properties as Record<string, unknown> | null | undefined) ?? (t.material_properties as Record<string, unknown> | null | undefined) ?? null,
      display_order: (t.display_order as number | undefined) ?? (t.sort_order as number | undefined) ?? 0,
      is_active: (t.is_active as boolean | undefined) ?? true,
      group_id: (t.group_id as string | undefined) ?? "",
      group_name: t.group_name as string | undefined,
      group_slug: t.group_slug as string | undefined,
    }));

    return { types, count: res.count ?? types.length };
  }

  // Buscar tipos de um grupo específico por slug
  async getTypesByGroupSlug(groupSlug: string): Promise<{ types: MaterialType[]; count: number; groupSlug: string }> {
    const res = await this.callAction<{ types: Record<string, unknown>[]; count?: number }>("types_by_group", { groupId: groupSlug });

    const types: MaterialType[] = (res.types || []).map((t) => ({
      id: (t.id as string | undefined) ?? (t.material_id as string | undefined) ?? "",
      name: (t.name as string | undefined) ?? (t.material_name as string | undefined) ?? "",
      slug: (t.slug as string | undefined) ?? (t.material_slug as string | undefined) ?? "",
      description: (t.description as string | null | undefined) ?? (t.material_description as string | null | undefined) ?? null,
      properties: (t.properties as Record<string, unknown> | null | undefined) ?? (t.material_properties as Record<string, unknown> | null | undefined) ?? null,
      display_order: (t.display_order as number | undefined) ?? (t.sort_order as number | undefined) ?? 0,
      is_active: (t.is_active as boolean | undefined) ?? true,
      group_id: (t.group_id as string | undefined) ?? "",
      group_name: t.group_name as string | undefined,
      group_slug: t.group_slug as string | undefined,
    }));

    return { types, count: res.count ?? types.length, groupSlug };
  }

  // Buscar materiais completos (tipos + grupos)
  async getComplete(): Promise<{ materials: MaterialComplete[]; count: number }> {
    const res = await this.callAction<{ materials: Record<string, unknown>[]; count?: number }>("complete");

    const materials: MaterialComplete[] = (res.materials || []).map((m) => ({
      type_id: (m.type_id as string | undefined) ?? (m.material_id as string | undefined) ?? (m.id as string | undefined) ?? "",
      type_name: (m.type_name as string | undefined) ?? (m.material_name as string | undefined) ?? (m.name as string | undefined) ?? "",
      type_slug: (m.type_slug as string | undefined) ?? (m.material_slug as string | undefined) ?? (m.slug as string | undefined) ?? "",
      type_description: (m.type_description as string | null | undefined) ?? (m.material_description as string | null | undefined) ?? (m.description as string | null | undefined) ?? null,
      type_properties: (m.type_properties as Record<string, unknown> | null | undefined) ?? (m.properties as Record<string, unknown> | null | undefined) ?? null,
      type_display_order: (m.type_display_order as number | undefined) ?? (m.display_order as number | undefined) ?? 0,
      group_id: (m.group_id as string | undefined) ?? "",
      group_name: (m.group_name as string | undefined) ?? "",
      group_slug: (m.group_slug as string | undefined) ?? "",
      group_description: (m.group_description as string | null | undefined) ?? null,
      group_hex_code: (m.group_hex_code as string | null | undefined) ?? null,
      group_icon: (m.group_icon as string | null | undefined) ?? null,
      group_display_order: (m.group_display_order as number | undefined) ?? (m.display_order as number | undefined) ?? 0,
    }));

    return { materials, count: res.count ?? materials.length };
  }

  // Buscar estatísticas gerais
  async getStats(): Promise<{ 
    groups: MaterialGroup[]; 
    summary: { totalGroups: number; totalMaterials: number; totalProducts: number } 
  }> {
    return this.callAction('stats');
  }

  // Buscar materiais por termo
  async search(searchTerm: string): Promise<{ types: MaterialComplete[]; count: number; search: string }> {
    return this.callAction('search', { search: searchTerm });
  }

  // Buscar materiais de um produto específico
  async getProductMaterials(productId: string): Promise<{ materials: Record<string, unknown>[]; count: number; productId: string }> {
    return this.callAction('product_materials', { productId });
  }

  // Buscar IDs de produtos que possuem determinados materiais
  async getProductsByMaterials(options: {
    materialTypeIds?: string[];
    materialGroupSlugs?: string[];
  }): Promise<{ productIds: string[]; count: number; materialTypeIds?: string[] }> {
    return this.callAction('products_by_materials', options);
  }
}

export const materialService = new MaterialService();
