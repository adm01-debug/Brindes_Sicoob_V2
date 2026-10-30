/**
 * Shared types for product registration form
 */
import { z } from "zod/v3";

export const productFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  sku: z.string().min(2, "SKU deve ter pelo menos 2 caracteres"),
  price: z.number().min(0.01, "Preço deve ser maior que zero"),
  supplier_id: z.string().min(1, "Selecione um fornecedor"),
  category_id: z.string().min(1, "Selecione uma categoria"),
  images: z.array(z.object({
    url: z.string().url("URL inválida"),
    alt_text: z.string().optional(),
    is_primary: z.boolean().optional(),
    image_type: z.enum(["main", "gallery", "detail", "mockup"]).optional(),
  })).min(1, "Adicione pelo menos uma imagem"),
  colors: z.array(z.string()).min(1, "Selecione pelo menos uma cor"),
  materials: z.array(z.string()).min(1, "Selecione pelo menos um material"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  cost_price: z.number().optional(),
  subcategory_id: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  weight_grams: z.number().optional(),
  width_cm: z.number().optional(),
  height_cm: z.number().optional(),
  depth_cm: z.number().optional(),
  min_quantity: z.number().optional(),
  stock: z.number().optional(),
  lead_time_days: z.number().optional(),
  is_kit: z.boolean().optional(),
  is_active: z.boolean().optional(),
  technique_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

export type ProductFormSchema = z.infer<typeof productFormSchema>;

export interface ReferenceDataState {
  isLoading: boolean;
  suppliers: Array<{ id: string; name: string; code?: string }>;
  categories: Array<{ id: string; name: string }>;
  colors: Array<{ id: string; color_name: string; hex_code?: string }>;
  materials: Array<{ id: string; material_name: string }>;
  techniques: Array<{ id: string; name: string }>;
}
