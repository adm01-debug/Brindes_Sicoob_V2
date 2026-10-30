// ─── Preset Constants & Utilities ─────────────────────────
import type { FilterState } from "./FilterPanel";

export const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7",
];

export const PRESET_EMOJIS = [
  "📦", "🎯", "⭐", "🔥", "💎", "🏷️", "🎨", "🛒",
  "📋", "🚀", "💡", "🎁", "🏆", "📌", "✨", "🔖",
  "🎪", "🧲", "💼", "🎒", "🏅", "🔔", "💫", "🧩",
  "🌟", "🎈", "🧳", "📎", "🎵", "🌈", "⚡", "🍀",
  "🦋", "🔑",
];

/** Count the number of active filter dimensions in a FilterState */
function hasCustomPriceRange(filters: FilterState) {
  return (filters.priceRange?.[0] ?? 0) > 0 || (filters.priceRange?.[1] ?? 500) < 500;
}

export function countFilters(filters: FilterState): number {
  const collections = [filters.categories, filters.suppliers, filters.colorGroups, filters.colorVariations, filters.gender, filters.sizes];
  const collectionCount = collections.reduce((total, values) => total + (values?.length ?? 0), 0);
  const flags = [hasCustomPriceRange(filters), filters.minStock > 0, filters.inStock, filters.featured, filters.isNew];
  return collectionCount + flags.filter(Boolean).length;
}

/** Build a human-readable summary of a preset's filters */
function countLabel(count: number | undefined, singular: string, plural: string) {
  return count ? `${count} ${count === 1 ? singular : plural}` : null;
}

function filterFlagLabels(filters: FilterState) {
  const entries: Array<[boolean, string]> = [[hasCustomPriceRange(filters), "faixa de preço"], [filters.inStock, "em estoque"],
    [filters.featured, "destaques"], [filters.isNew, "novidades"]];
  return entries.filter(([active]) => active).map(([, label]) => label);
}

export function summarizeFilters(filters: FilterState): string {
  const counts = [
    countLabel(filters.categories?.length, "categoria", "categorias"),
    countLabel(filters.suppliers?.length, "fornecedor", "fornecedores"),
    countLabel(filters.colorGroups?.length, "cor", "cores"),
    countLabel(filters.gender?.length, "gênero", "gêneros"),
    countLabel(filters.sizes?.length, "tamanho", "tamanhos"),
  ];
  const parts = [...counts, ...filterFlagLabels(filters)].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(" · ") : "Sem filtros";
}
