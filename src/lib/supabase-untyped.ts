/**
 * Typed wrapper for Supabase tables not yet in the generated schema.
 * Eliminates `as any` casts while maintaining type safety.
 * 
 * Usage:
 *   const { data } = await untypedFrom<MyType>("my_table").select("*").eq("id", id);
 */
import { supabase } from "@/integrations/supabase/client";

type PostgrestError = { message: string; details?: string; hint?: string; code?: string };

export interface UntypedSingleResult<T> extends PromiseLike<{ data: T | null; error: PostgrestError | null }> {}

export interface UntypedFilterBuilder<T>
  extends PromiseLike<{ data: T[] | null; error: PostgrestError | null; count?: number | null }> {
  eq: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  neq: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  in: (column: string, values: unknown[]) => UntypedFilterBuilder<T>;
  is: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  gt: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  gte: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  lt: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  lte: (column: string, value: unknown) => UntypedFilterBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => UntypedFilterBuilder<T>;
  limit: (count: number) => UntypedFilterBuilder<T>;
  range: (from: number, to: number) => UntypedFilterBuilder<T>;
  single: () => UntypedSingleResult<T>;
  maybeSingle: () => UntypedSingleResult<T>;
}

export interface UntypedQueryBuilder<T> {
  select: (columns?: string) => UntypedFilterBuilder<T>;
  insert: (values: Partial<T> | Partial<T>[]) => UntypedFilterBuilder<T>;
  update: (values: Partial<T>) => UntypedFilterBuilder<T>;
  upsert: (values: Partial<T> | Partial<T>[]) => UntypedFilterBuilder<T>;
  delete: () => UntypedFilterBuilder<T>;
}

/**
 * Access a Supabase table that doesn't exist in the generated types.
 * Returns a query builder typed against the caller-provided shape `T`.
 */
export function untypedFrom<T = Record<string, unknown>>(table: string): UntypedQueryBuilder<T> {
  const builder = supabase.from(table as never);
  return builder as UntypedQueryBuilder<T>;
}

// Known untyped table names for documentation
export type UntypedTable =
  | "product_component_locations"
  | "product_component_location_techniques"
  | "product_group_components"
  | "product_group_locations"
  | "product_group_location_techniques"
  | "color_nuances";
