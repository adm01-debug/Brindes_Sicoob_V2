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
  properties: Record<string, unknown> | null;
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
  type_properties: Record<string, unknown> | null;
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
function firstString(...values: unknown[]): string {
  const value = values.find((candidate) => typeof candidate === "string");
  return typeof value === "string" ? value : "";
}

function nullableString(...values: unknown[]): string | null {
  const value = values.find((candidate) => typeof candidate === "string" || candidate === null);
  return typeof value === "string" ? value : null;
}

function firstNumber(...values: unknown[]): number {
  const value = values.find((candidate) => typeof candidate === "number");
  return typeof value === "number" ? value : 0;
}

function nullableRecord(...values: unknown[]): Record<string, unknown> | null {
  const value = values.find((candidate) => candidate !== undefined);
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function booleanOrTrue(value: unknown): boolean {
  return typeof value === "boolean" ? value : true;
}

function mapMaterialGroup(group: Record<string, unknown>): MaterialGroup {
  return {
    group_id: firstString(group.group_id, group.id),
    group_name: firstString(group.group_name, group.name),
    group_slug: firstString(group.group_slug, group.slug),
    group_description: nullableString(group.group_description, group.description),
    group_hex_code: nullableString(group.group_hex_code, group.hex_code),
    group_icon: nullableString(group.group_icon, group.icon),
    display_order: firstNumber(group.display_order, group.sort_order),
    total_materials: firstNumber(group.total_materials, group.materials_count),
    products_using: firstNumber(group.products_using, group.products_count),
  };
}

function mapMaterialType(type: Record<string, unknown>): MaterialType {
  return {
    id: firstString(type.id, type.material_id),
    name: firstString(type.name, type.material_name),
    slug: firstString(type.slug, type.material_slug),
    description: nullableString(type.description, type.material_description),
    properties: nullableRecord(type.properties, type.material_properties),
    display_order: firstNumber(type.display_order, type.sort_order),
    is_active: booleanOrTrue(type.is_active),
    group_id: firstString(type.group_id),
    group_name: firstString(type.group_name) || undefined,
    group_slug: firstString(type.group_slug) || undefined,
  };
}

function mapCompleteMaterial(material: Record<string, unknown>): MaterialComplete {
  return {
    type_id: firstString(material.type_id, material.material_id, material.id),
    type_name: firstString(material.type_name, material.material_name, material.name),
    type_slug: firstString(material.type_slug, material.material_slug, material.slug),
    type_description: nullableString(material.type_description, material.material_description, material.description),
    type_properties: nullableRecord(material.type_properties, material.properties),
    type_display_order: firstNumber(material.type_display_order, material.display_order),
    group_id: firstString(material.group_id),
    group_name: firstString(material.group_name),
    group_slug: firstString(material.group_slug),
    group_description: nullableString(material.group_description),
    group_hex_code: nullableString(material.group_hex_code),
    group_icon: nullableString(material.group_icon),
    group_display_order: firstNumber(material.group_display_order, material.display_order),
  };
}

class MaterialService extends BaseHttpService {
  protected getBaseUrl(): string {
    return getSupabaseFunctionUrl('materials-api');
  }

  private async callAction<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    return this.post<T>({ action, ...params });
  }


  // Buscar todos os grupos de materiais com estatísticas
  async getGroups(): Promise<{ groups: MaterialGroup[]; count: number }> {
    const res = await this.callAction<{ groups: Record<string, unknown>[]; count?: number }>("groups");

    const groups = (res.groups || []).map(mapMaterialGroup);

    return { groups, count: res.count ?? groups.length };
  }

  // Buscar todos os tipos de materiais
  async getTypes(): Promise<{ types: MaterialType[]; count: number }> {
    const res = await this.callAction<{ types: Record<string, unknown>[]; count?: number }>("types");

    const types = (res.types || []).map(mapMaterialType);

    return { types, count: res.count ?? types.length };
  }

  // Buscar tipos de um grupo específico por slug
  async getTypesByGroupSlug(groupSlug: string): Promise<{ types: MaterialType[]; count: number; groupSlug: string }> {
    const res = await this.callAction<{ types: Record<string, unknown>[]; count?: number }>("types_by_group", { groupId: groupSlug });

    const types = (res.types || []).map(mapMaterialType);

    return { types, count: res.count ?? types.length, groupSlug };
  }

  // Buscar materiais completos (tipos + grupos)
  async getComplete(): Promise<{ materials: MaterialComplete[]; count: number }> {
    const res = await this.callAction<{ materials: Record<string, unknown>[]; count?: number }>("complete");

    const materials = (res.materials || []).map(mapCompleteMaterial);

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
