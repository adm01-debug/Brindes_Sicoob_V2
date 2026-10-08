/**
 * Match card components extracted from ProductMatchPage.
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { type Product } from '@/hooks/useProducts';
import { type MatchResult } from '@/hooks/useProductMatch';
import { cn } from '@/lib/utils';
import { getCdnUrl } from '@/utils/image-utils';
import { ExternalLink, Users, Tag, Layers, Equal, Link2, FileText } from 'lucide-react';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export const MATCH_TYPE_CONFIG = {
  identical: { label: 'Idêntico', icon: Equal, color: 'bg-primary text-primary-foreground' },
  similar: { label: 'Semelhante', icon: Layers, color: 'bg-info text-info-foreground' },
  complementary: {
    label: 'Complementar',
    icon: Link2,
    color: 'bg-warning text-warning-foreground',
  },
} as const;

function productImage(product: Product) {
  return getCdnUrl(product.images?.[0] || product.image_url || '/placeholder.svg', 'small');
}

function ProductIdentity({ product }: { product: Product }) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <h3 className="font-display text-sm font-bold leading-tight text-foreground">
        {product.name}
      </h3>
      <p className="text-[11px] text-muted-foreground">SKU: {product.sku}</p>
      <p className="text-sm font-semibold text-foreground">{formatPrice(product.price)}</p>
      <div className="flex flex-wrap gap-1 pt-1">
        {product.category?.name && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {product.category.name}
          </Badge>
        )}
        {product.supplier?.name && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {product.supplier.name}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ProductTagRow({ icon, tags }: { icon: typeof Users; tags: string[] }) {
  if (tags.length === 0) return null;
  const Icon = icon;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Icon className="h-3 w-3 shrink-0 text-primary" />
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[9px]">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function ProductTags({ product }: { product: Product }) {
  if (!product.tags) return null;
  return (
    <div className="space-y-1.5">
      <ProductTagRow icon={Users} tags={product.tags.publicoAlvo ?? []} />
      <ProductTagRow icon={Tag} tags={product.tags.nicho ?? []} />
    </div>
  );
}

export function SelectedProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <img
            src={productImage(product)}
            alt={product.name}
            className="h-20 w-20 shrink-0 rounded-lg bg-muted object-cover"
            loading="lazy"
          />
          <ProductIdentity product={product} />
        </div>
        <ProductTags product={product} />
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => navigate(`/produto/${product.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

function buildQuotePath(product: Product) {
  const params = new URLSearchParams({
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku || '',
    product_price: String(product.price),
    min_quantity: String(product.minQuantity || 1),
    ...(product.image_url ? { product_image: product.image_url } : {}),
  });
  return `/orcamentos/novo?${params.toString()}`;
}

function MatchHeading({ match }: { match: MatchResult }) {
  const config = MATCH_TYPE_CONFIG[match.matchType];
  const Icon = config.icon;
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-xs font-bold text-foreground">{match.product.name}</h4>
        <p className="text-[10px] text-muted-foreground">
          {match.product.sku} • {formatPrice(match.product.price)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge className={cn('gap-0.5 px-1.5 py-0 text-[9px]', config.color)}>
          <Icon className="h-2.5 w-2.5" />
          {config.label}
        </Badge>
        <Badge variant="outline" className="px-1.5 py-0 font-mono text-[9px]">
          {match.score}pts
        </Badge>
      </div>
    </div>
  );
}

function MatchReasons({ reasons }: { reasons: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map((reason) => (
        <span
          key={reason}
          className="inline-flex items-center rounded bg-secondary/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

function MatchMetadata({ product }: { product: Product }) {
  const metadata = [
    product.category?.name,
    product.supplier?.name,
    product.colors?.length ? `${product.colors.length} cores` : undefined,
  ].filter((value): value is string => Boolean(value));
  return <div className="text-[10px] text-muted-foreground">{metadata.join(' • ')}</div>;
}

function MatchActions({
  match,
  onNavigate,
}: {
  match: MatchResult;
  onNavigate: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Button
        variant="outline"
        size="sm"
        className="h-6 gap-1 px-2 text-[10px]"
        onClick={() => navigate(buildQuotePath(match.product))}
      >
        <FileText className="h-3 w-3" />
        Orçamento
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6 gap-1 px-2 text-[10px]"
        onClick={() => onNavigate(match.product.id)}
      >
        <ExternalLink className="h-3 w-3" />
        Detalhes
      </Button>
    </div>
  );
}

export function MatchCard({
  match,
  onNavigate,
}: {
  match: MatchResult;
  onNavigate: (id: string) => void;
}) {
  return (
    <Card className="group border-border/40 transition-all hover:border-border/80 hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-3">
        <img
          src={productImage(match.product)}
          alt={match.product.name}
          className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <MatchHeading match={match} />
          <MatchReasons reasons={match.reasons} />
          <MatchMetadata product={match.product} />
          <MatchActions match={match} onNavigate={onNavigate} />
        </div>
      </CardContent>
    </Card>
  );
}
