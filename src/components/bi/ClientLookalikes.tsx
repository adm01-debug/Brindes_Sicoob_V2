/**
 * ClientLookalikes — "Clientes parecidos com este também compram..."
 * Heurística: empresas do mesmo ramo + (LTV agregado de quotes ±30% do cliente atual)
 *           → top produtos comprados por elas que o cliente atual ainda NÃO compra.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectCrm } from "@/lib/crm-db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package, Sparkles, Tag } from "lucide-react";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";
import { useIndustryCategoryTrends } from "@/hooks/bi/useIndustryCategoryTrends";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
}

interface IndustryProductRow {
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  unique_clients: number;
  avg_unit_price: number;
}

interface LookalikeData {
  products: IndustryProductRow[];
  lookalikeCount: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface LookalikeQueryParams {
  clientId: string;
  ramoAtividade: string | null;
  avgTicket: number;
  affinityLoading: boolean;
  ownProductIds: Set<string>;
  ownProductNames: Set<string>;
}

function useLookalikeProducts({ clientId, ramoAtividade, avgTicket, affinityLoading, ownProductIds, ownProductNames }: LookalikeQueryParams) {
  return useQuery({
    queryKey: ["bi-lookalikes", clientId, ramoAtividade, avgTicket],
    enabled: !!ramoAtividade && !affinityLoading,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<LookalikeData> => {
      if (!ramoAtividade) return { products: [], lookalikeCount: 0 };
      const companies = await selectCrm<{ id: string }>("companies", { select: "id", filters: { ramo_atividade: ramoAtividade, deleted_at: null }, limit: 500 });
      const ids = companies.map((company) => company.id).filter((id) => id && id !== clientId);
      if (ids.length === 0) return { products: [], lookalikeCount: 0 };
      const { data, error } = await supabase.rpc("get_industry_top_products", { _company_ids: ids, _days: 90, _limit: 30 });
      if (error) return { products: [], lookalikeCount: ids.length };
      const rows = (data ?? []) as IndustryProductRow[];
      const products = rows.filter((row) => {
        if (row.product_id && ownProductIds.has(row.product_id)) return false;
        return !ownProductNames.has(row.product_name.toLowerCase());
      }).slice(0, 6);
      return { products, lookalikeCount: ids.length };
    },
  });
}

function SharedCategories({ categories }: { categories: string[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"><Tag className="h-3 w-3 inline mr-1" />Categorias em comum:</span>
      {categories.map((label) => <Badge key={label} variant="secondary" className="text-[10px]">{label}</Badge>)}
    </div>
  );
}

function LookalikeProduct({ product }: { product: IndustryProductRow }) {
  return (
    <div className="p-3 rounded-lg border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
      {product.product_image_url ? <div className="aspect-square rounded-md overflow-hidden bg-muted/40 mb-2 border"><img src={product.product_image_url} alt={product.product_name} loading="lazy" className="w-full h-full object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div> : <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center mb-2"><Package className="h-6 w-6 text-muted-foreground" /></div>}
      <div className="text-xs font-medium line-clamp-2 leading-snug min-h-[2rem]">{product.product_name}</div>
      <div className="mt-1.5 flex items-center justify-between text-[10px]"><span className="text-muted-foreground">{product.unique_clients} emp.</span><span className="font-semibold tabular-nums">{fmtBRL(product.avg_unit_price)}</span></div>
    </div>
  );
}

function LookalikesCard({ data, ramoAtividade, sharedCategories }: { data: LookalikeData; ramoAtividade: string; sharedCategories: string[] }) {
  return (
    <Card className="border-[1.5px]"><CardContent className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div><div><h2 className="font-display font-semibold">Clientes parecidos também compram</h2><p className="text-xs text-muted-foreground">Produtos comprados por outras {data.lookalikeCount} empresas de <span className="font-medium">{ramoAtividade}</span> · que este cliente ainda NÃO leva</p></div></div>
        <Badge variant="outline" className="gap-1 border-blue-500/40 text-blue-700 dark:text-blue-300 text-[10px]"><Sparkles className="h-3 w-3" /> Gap de oportunidade</Badge>
      </div>
      <SharedCategories categories={sharedCategories} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{data.products.map((product) => <LookalikeProduct key={`${product.product_id}-${product.product_name}`} product={product} />)}</div>
    </CardContent></Card>
  );
}

function LookalikesSkeleton() {
  return <Card className="border-[1.5px]"><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-72" /><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[1, 2, 3, 4, 5, 6].map((value) => <Skeleton key={value} className="h-36 rounded-xl" />)}</div></CardContent></Card>;
}

export function ClientLookalikes({ clientId, ramoAtividade }: Props) {
  const bi = useClientBI(clientId);
  const affinity = useClientAffinity(clientId);
  const clientCats = useClientCategoryAffinity(clientId);
  const industryCats = useIndustryCategoryTrends(ramoAtividade, clientId);

  const ownProductIds = new Set(
    (affinity.data?.topProducts ?? [])
      .map((p) => p.product_id)
      .filter(Boolean) as string[],
  );
  const ownProductNames = new Set(
    (affinity.data?.topProducts ?? []).map((p) => p.product_name.toLowerCase()),
  );

  const sectorSlugs = new Set(industryCats.categories.map((category) => category.slug));
  const sharedCategories = clientCats.categories.filter((category) => sectorSlugs.has(category.slug)).slice(0, 4).map((category) => category.label);
  const { data, isLoading } = useLookalikeProducts({ clientId, ramoAtividade, avgTicket: bi.avgTicket, affinityLoading: affinity.isLoading, ownProductIds, ownProductNames });

  if (!ramoAtividade) return null;

  if (isLoading || affinity.isLoading) return <LookalikesSkeleton />;

  if (!data || data.products.length === 0) return null;
  return <LookalikesCard data={data} ramoAtividade={ramoAtividade} sharedCategories={sharedCategories} />;
}
