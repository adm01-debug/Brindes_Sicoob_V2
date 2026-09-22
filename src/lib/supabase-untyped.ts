/**
 * Typed wrapper for Supabase tables not yet in the generated schema.
 * Eliminates `as any` casts while maintaining type safety.
 *
 * Usage:
 *   const { data } = await untypedFrom<MyType>("my_table").select("*").eq("id", id);
 */
import { supabase } from "@/integrations/supabase/client";

type UntypedError = { message: string } | null;

export interface UntypedFilterBuilder<T> extends PromiseLike<{ data: T[] | null; error: UntypedError }> {
  eq(column: string, value: unknown): UntypedFilterBuilder<T>;
  neq(column: string, value: unknown): UntypedFilterBuilder<T>;
  in(column: string, values: unknown[]): UntypedFilterBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): UntypedFilterBuilder<T>;
  limit(count: number): UntypedFilterBuilder<T>;
  select(columns?: string): UntypedFilterBuilder<T>;
  single(): PromiseLike<{ data: T | null; error: UntypedError }>;
  maybeSingle(): PromiseLike<{ data: T | null; error: UntypedError }>;
}

export interface UntypedQueryBuilder<T> {
  select(columns?: string): UntypedFilterBuilder<T>;
  insert(values: Partial<T> | Partial<T>[]): UntypedFilterBuilder<T>;
  upsert(values: Partial<T> | Partial<T>[]): UntypedFilterBuilder<T>;
  update(values: Partial<T>): UntypedFilterBuilder<T>;
  delete(): UntypedFilterBuilder<T>;
}

/**
 * Access a Supabase table that doesn't exist in the generated types.
 * Returns a fully typed query builder for the provided row shape `T`.
 *
 * `T extends object` (não `Record<string, unknown>`): a constraint anterior
 * exigia que T tivesse um index signature implícito, o que uma interface
 * comum (`interface Foo { id: string }`) nunca satisfaz estruturalmente —
 * rejeitava exatamente o uso documentado acima (`untypedFrom<MyType>`,
 * MyType sendo uma interface). T só aparece em posições `Partial<T>`/`T[]`
 * neste arquivo, nunca com acesso por índice, então a constraint nunca
 * cumpriu função nenhuma além de barrar o caso de uso pretendido.
 */
export function untypedFrom<T extends object = Record<string, unknown>>(
  table: string
): UntypedQueryBuilder<T> {
  return supabase.from(table as never) as UntypedQueryBuilder<T>;
}

// Known untyped table names for documentation
export type UntypedTable =
  | "product_component_locations"
  | "product_component_location_techniques"
  | "product_group_components"
  | "product_group_locations"
  | "product_group_location_techniques"
  | "password_reset_requests"
  | "roles";
