import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export interface PublicFavoriteList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  shared_expires_at: string | null;
}

export interface PublicFavoriteItem {
  id: string;
  product_id: string;
  variant_info: {
    color_name?: string | null;
    color_hex?: string | null;
    thumbnail?: string | null;
  } | null;
  note: string | null;
  added_at: string;
}

export interface PublicFavoriteListResponse {
  list: PublicFavoriteList;
  items: PublicFavoriteItem[];
}

export interface PublicFavoriteReaction {
  item_id: string;
  emoji: string;
  anon_id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parsePublicFavoriteList(value: unknown): PublicFavoriteList | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.color !== "string" ||
    !isNullableString(value.description) ||
    !isNullableString(value.shared_expires_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    color: value.color,
    shared_expires_at: value.shared_expires_at,
  };
}

function isPublicFavoriteItem(value: unknown): value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.product_id !== "string" ||
    !isNullableString(value.note) ||
    typeof value.added_at !== "string"
  ) {
    return false;
  }
  return true;
}

function parseVariantInfo(value: unknown): PublicFavoriteItem["variant_info"] {
  if (!isRecord(value)) return null;

  return {
    color_name: typeof value.color_name === "string" || value.color_name === null
      ? value.color_name
      : undefined,
    color_hex: typeof value.color_hex === "string" || value.color_hex === null
      ? value.color_hex
      : undefined,
    thumbnail: typeof value.thumbnail === "string" || value.thumbnail === null
      ? value.thumbnail
      : undefined,
  };
}

function parsePublicFavoriteItem(value: unknown): PublicFavoriteItem | null {
  if (!isPublicFavoriteItem(value)) return null;

  const variantInfo = parseVariantInfo(value.variant_info);

  return {
    id: value.id,
    product_id: value.product_id,
    variant_info: variantInfo,
    note: value.note,
    added_at: value.added_at,
  };
}

export function parsePublicFavoriteListResponse(value: Json | null): PublicFavoriteListResponse | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error("Resposta inválida da lista pública de favoritos.");

  const list = parsePublicFavoriteList(value.list);
  if (!list || !Array.isArray(value.items)) {
    throw new Error("Resposta inválida da lista pública de favoritos.");
  }

  const items = value.items.map(parsePublicFavoriteItem);
  if (items.some((item) => item === null)) {
    throw new Error("Resposta inválida dos itens da lista pública de favoritos.");
  }

  return { list, items: items as PublicFavoriteItem[] };
}

export async function fetchPublicFavoriteList(token?: string): Promise<PublicFavoriteListResponse | null> {
  if (!token) return null;

  const { data, error } = await supabase.rpc("get_public_favorite_list", { _token: token });
  if (error) throw error;
  return parsePublicFavoriteListResponse(data);
}

export async function fetchPublicFavoriteReactions(
  token?: string | null,
  anonId?: string,
): Promise<PublicFavoriteReaction[]> {
  if (!token || !anonId) return [];

  const { data, error } = await supabase.rpc("get_public_favorite_reactions", {
    _token: token,
    _anon_id: anonId,
  });
  if (error) throw error;
  return data ?? [];
}
