/**
 * ComparePage — Comparador de produtos (10/10)
 * C1: score, radar, AI advisor, TCO, differences-only.
 * C2: CRM picker, share público, export, sync, CTA orçamento.
 * C3: Duel mode, mobile carousel, presentation, variant sync.
 * C4: similar rail, presentation launcher.
 * C5: shortcuts, ARIA-live, smart empty state, recent sidebar.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import {
  useComparisonStore,
  type CompareItem,
  type CompareVariantInfo,
} from '@/stores/useComparisonStore';
import { useProductsContext } from '@/contexts/ProductsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  X,
  ArrowLeft,
  Share2,
  Image as ImageIcon,
  List,
  Filter,
  FileText,
  Building2,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncedZoomGallery } from '@/components/compare/SyncedZoomGallery';
import { CompareTableView } from '@/components/compare/CompareTableView';
import { ComparisonScoreCard } from '@/components/compare/ComparisonScoreCard';
import { ComparisonRadarChart } from '@/components/compare/ComparisonRadarChart';
import { AIComparisonAdvisor } from '@/components/compare/AIComparisonAdvisor';
import { ShareComparisonDialog } from '@/components/compare/ShareComparisonDialog';
import { ExportComparisonButton } from '@/components/compare/ExportComparisonButton';
import { ComparisonDuelView } from '@/components/compare/ComparisonDuelView';
import { ComparisonMobileView } from '@/components/compare/ComparisonMobileView';
import { ComparisonPresentationLauncher } from '@/components/compare/ComparisonPresentationLauncher';
import { SimilarProductsRail } from '@/components/compare/SimilarProductsRail';
import { CompareEmptyStateSmart } from '@/components/compare/CompareEmptyStateSmart';
import { RecentComparisonsSidebar } from '@/components/compare/RecentComparisonsSidebar';
import { FavoritesClientPicker } from '@/components/favorites/FavoritesClientPicker';
import { useComparisonSync } from '@/hooks/useComparisonSync';
import { useComparisonShortcuts } from '@/hooks/useComparisonShortcuts';
import type { Product } from '@/hooks/useProducts';

interface CompareEntry {
  product: Product;
  variant: CompareVariantInfo | undefined;
  index: number;
}

type SelectedClient = { id: string; name: string } | null;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function getStockStatusLabel(status: string) {
  const inStockStatus = { label: 'Em estoque', color: 'text-success' };
  const statuses: Record<string, { label: string; color: string }> = {
    'in-stock': inStockStatus,
    'low-stock': { label: 'Estoque baixo', color: 'text-warning' },
    'out-of-stock': { label: 'Sem estoque', color: 'text-destructive' },
  };
  return statuses[status] ?? inStockStatus;
}

function ClientPicker({
  client,
  setClient,
}: {
  client: SelectedClient;
  setClient: (client: SelectedClient) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={client ? 'default' : 'outline'} size="sm">
          <Building2 className="mr-2 h-4 w-4" />
          {client ? client.name.slice(0, 22) : 'Cliente CRM'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <FavoritesClientPicker
          selectedClientId={client?.id ?? null}
          selectedClientName={client?.name ?? null}
          onSelect={setClient}
        />
      </PopoverContent>
    </Popover>
  );
}

function CompareActions({
  client,
  setClient,
  differencesOnly,
  toggleDifferences,
  products,
  createQuote,
  share,
  clear,
}: {
  client: SelectedClient;
  setClient: (client: SelectedClient) => void;
  differencesOnly: boolean;
  toggleDifferences: () => void;
  products: Product[];
  createQuote: () => void;
  share: () => void;
  clear: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ClientPicker client={client} setClient={setClient} />
      <RecentComparisonsSidebar />
      <Button
        variant={differencesOnly ? 'default' : 'outline'}
        size="sm"
        onClick={toggleDifferences}
        aria-pressed={differencesOnly}
        title="Atalho: D"
      >
        <Filter className="mr-2 h-4 w-4" />
        {differencesOnly ? 'Mostrando diferenças' : 'Só diferenças'}
      </Button>
      <Button variant="default" size="sm" onClick={createQuote}>
        <FileText className="mr-2 h-4 w-4" />
        Criar orçamento
      </Button>
      <ComparisonPresentationLauncher products={products} formatCurrency={formatCurrency} />
      <ExportComparisonButton products={products} formatCurrency={formatCurrency} />
      <Button variant="outline" size="sm" onClick={share}>
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar
      </Button>
      <Button variant="outline" size="sm" onClick={clear}>
        Limpar
      </Button>
    </div>
  );
}

function CompareHeader({
  compareCount,
  client,
  goBack,
  actions,
}: {
  compareCount: number;
  client: SelectedClient;
  goBack: () => void;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1
            data-testid="page-title-comparador"
            className="font-display text-2xl font-bold text-foreground lg:text-3xl"
          >
            Comparador de Produtos
          </h1>
          <p className="text-muted-foreground">
            Comparando {compareCount} produtos
            {client && (
              <>
                {' '}
                · <span className="font-medium text-primary">{client.name}</span>
              </>
            )}
          </p>
        </div>
      </div>
      {actions}
    </div>
  );
}

function VariantBadge({ variant }: { variant: CompareVariantInfo | undefined }) {
  if (!variant?.color_name) return null;
  return (
    <Badge variant="secondary" className="gap-1 px-1.5 py-0.5 text-[10px]">
      {variant.color_hex && (
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
          style={{ backgroundColor: variant.color_hex }}
        />
      )}
      {variant.color_name}
    </Badge>
  );
}

function ProductStats({ product }: { product: Product }) {
  const status = getStockStatusLabel(product.stockStatus);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Mín:</span>
        <span>{product.minQuantity} un.</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Estoque:</span>
        <span className={status.color}>{status.label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Cores:</span>
        <div className="flex gap-0.5">
          {product.colors.slice(0, 4).map((color, index) => (
            <div
              key={index}
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: color.hex }}
            />
          ))}
          {product.colors.length > 4 && (
            <span className="ml-1 text-xs text-muted-foreground">+{product.colors.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductSummaryCard({
  entry,
  remove,
  openProduct,
}: {
  entry: CompareEntry;
  remove: () => void;
  openProduct: () => void;
}) {
  return (
    <div
      data-compare-product={entry.index}
      tabIndex={-1}
      className="card-lift space-y-3 rounded-xl border-[1.5px] border-primary/20 bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(entry.product.price)}
          </span>
          <VariantBadge variant={entry.variant} />
        </div>
        <button
          aria-label="Remover"
          onClick={remove}
          className="rounded-full p-1 transition-colors hover:bg-destructive/20"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <ProductStats product={entry.product} />
      <Button size="sm" className="w-full" onClick={openProduct}>
        Ver Detalhes
      </Button>
    </div>
  );
}

interface ComparisonTabsProps {
  compareEntries: CompareEntry[];
  products: Product[];
  differencesOnly: boolean;
  removeByIndex: (index: number) => void;
  openProduct: (id: string) => void;
}

function CompareTabsList() {
  return (
    <TabsList className="mx-auto mb-6 grid w-full max-w-md grid-cols-2">
      <TabsTrigger value="gallery" className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Galeria Visual
      </TabsTrigger>
      <TabsTrigger value="table" className="flex items-center gap-2">
        <List className="h-4 w-4" />
        Tabela Detalhada
      </TabsTrigger>
    </TabsList>
  );
}

function ComparisonTabs({
  compareEntries,
  products,
  differencesOnly,
  removeByIndex,
  openProduct,
}: ComparisonTabsProps) {
  return (
    <Tabs defaultValue="gallery" className="w-full">
      <CompareTabsList />
      <TabsContent value="gallery" className="space-y-6">
        <SyncedZoomGallery products={products} onProductClick={openProduct} />
        <div
          className={cn(
            'grid gap-4',
            products.length === 2 && 'grid-cols-2',
            products.length === 3 && 'grid-cols-3',
            products.length >= 4 && 'grid-cols-2 lg:grid-cols-4',
          )}
        >
          {compareEntries.map((entry) => (
            <ProductSummaryCard
              key={`card-${entry.index}`}
              entry={entry}
              remove={() => removeByIndex(entry.index)}
              openProduct={() => openProduct(entry.product.id)}
            />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="table">
        <CompareTableView
          entries={compareEntries}
          products={products}
          formatCurrency={formatCurrency}
          getStockStatusLabel={getStockStatusLabel}
          onRemove={removeByIndex}
          differencesOnly={differencesOnly}
        />
      </TabsContent>
    </Tabs>
  );
}

interface DesktopComparisonProps {
  products: Product[];
  compareEntries: CompareEntry[];
  compareCount: number;
  showRadar: boolean;
  duelMode: boolean;
  toggleDuel: () => void;
  differencesOnly: boolean;
  removeByIndex: (index: number) => void;
  openProduct: (id: string) => void;
}

function DesktopComparison({
  products,
  compareEntries,
  compareCount,
  showRadar,
  duelMode,
  toggleDuel,
  differencesOnly,
  removeByIndex,
  openProduct,
}: DesktopComparisonProps) {
  const useDuel = compareCount === 2 && duelMode;
  return (
    <div className="hidden space-y-4 md:block">
      <div className={cn('grid grid-cols-1 gap-4', showRadar && 'lg:grid-cols-2')}>
        <ComparisonScoreCard products={products} />
        {showRadar && <ComparisonRadarChart products={products} />}
      </div>
      <AIComparisonAdvisor products={products} />
      {compareCount === 2 && (
        <div className="flex items-center justify-center">
          <Button size="sm" variant={duelMode ? 'default' : 'outline'} onClick={toggleDuel}>
            <Swords className="mr-2 h-4 w-4" />
            {duelMode ? 'Modo Duelo ativo' : 'Ativar Modo Duelo'}
          </Button>
        </div>
      )}
      {useDuel ? (
        <ComparisonDuelView
          products={products}
          formatCurrency={formatCurrency}
          onRemove={removeByIndex}
          onProductClick={openProduct}
        />
      ) : (
        <ComparisonTabs
          compareEntries={compareEntries}
          products={products}
          differencesOnly={differencesOnly}
          removeByIndex={removeByIndex}
          openProduct={openProduct}
        />
      )}
      <SimilarProductsRail products={products} formatCurrency={formatCurrency} />
    </div>
  );
}

function useComparisonAnnouncement(compareCount: number) {
  const [message, setMessage] = useState('');
  const [previousCount, setPreviousCount] = useState(compareCount);
  useEffect(() => {
    if (compareCount > previousCount)
      setMessage(`Produto adicionado. ${compareCount} produtos em comparação.`);
    else if (compareCount === 0 && compareCount < previousCount) setMessage('Comparação limpa.');
    else if (compareCount < previousCount)
      setMessage(`Produto removido. ${compareCount} produtos em comparação.`);
    setPreviousCount(compareCount);
  }, [compareCount, previousCount]);
  return message;
}

function useCompareEntries(
  compareItems: CompareItem[],
  getProductsByIds: ReturnType<typeof useProductsContext>['getProductsByIds'],
  cacheSignal: Product[],
) {
  return useMemo(() => {
    void cacheSignal;
    const uniqueIds = [...new Set(compareItems.map((item) => item.productId))];
    const productMap = new Map<string, Product>();
    getProductsByIds(uniqueIds).forEach((product) => productMap.set(product.id, product));
    return compareItems
      .map((item, index) => {
        const product = productMap.get(item.productId);
        if (!product) return null;
        const displayProduct = item.variant?.thumbnail
          ? { ...product, images: [item.variant.thumbnail, ...product.images] }
          : product;
        return { product: displayProduct, variant: item.variant, index };
      })
      .filter((entry): entry is CompareEntry => entry !== null);
  }, [compareItems, getProductsByIds, cacheSignal]);
}

function EmptyComparison() {
  return (
    <>
      <PageSEO
        title="Comparar Produtos"
        description="Compare brindes lado a lado."
        path="/comparar"
        jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Comparar Produtos' }}
      />
      <CompareEmptyStateSmart />
    </>
  );
}

interface ActiveComparisonProps {
  ariaMessage: string;
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
  compareItems: CompareItem[];
  client: SelectedClient;
  setClient: (client: SelectedClient) => void;
  compareCount: number;
  products: Product[];
  compareEntries: CompareEntry[];
  differencesOnly: boolean;
  toggleDifferences: () => void;
  createQuote: () => void;
  clear: () => void;
  removeByIndex: (index: number) => void;
  showRadar: boolean;
  duelMode: boolean;
  toggleDuel: () => void;
  goBack: () => void;
  openProduct: (id: string) => void;
}

function ComparisonStatus({ props }: { props: ActiveComparisonProps }) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {props.ariaMessage}
      </div>
      <ShareComparisonDialog
        open={props.shareOpen}
        onOpenChange={props.setShareOpen}
        compareItems={props.compareItems}
        clientId={props.client?.id ?? null}
        clientName={props.client?.name ?? null}
      />
    </>
  );
}

function ActiveComparison(props: ActiveComparisonProps) {
  const actions = (
    <CompareActions
      client={props.client}
      setClient={props.setClient}
      differencesOnly={props.differencesOnly}
      toggleDifferences={props.toggleDifferences}
      products={props.products}
      createQuote={props.createQuote}
      share={() => props.setShareOpen(true)}
      clear={props.clear}
    />
  );
  return (
    <>
      <ComparisonStatus props={props} />
      <div
        id="compare-export-area"
        className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8"
      >
        <CompareHeader
          compareCount={props.compareCount}
          client={props.client}
          goBack={props.goBack}
          actions={actions}
        />
        <ComparisonMobileView
          products={props.products}
          formatCurrency={formatCurrency}
          onRemove={props.removeByIndex}
          onProductClick={props.openProduct}
        />
        <DesktopComparison
          products={props.products}
          compareEntries={props.compareEntries}
          compareCount={props.compareCount}
          showRadar={props.showRadar}
          duelMode={props.duelMode}
          toggleDuel={props.toggleDuel}
          differencesOnly={props.differencesOnly}
          removeByIndex={props.removeByIndex}
          openProduct={props.openProduct}
        />
      </div>
    </>
  );
}

function createQuoteUrl(
  compareItems: CompareItem[],
  client: SelectedClient,
) {
  const productParams = compareItems.map((item) => item.productId).join(',');
  const params = new URLSearchParams({ products: productParams });
  if (client?.id) params.set('client_id', client.id);
  if (client?.name) params.set('client_name', client.name);
  return `/orcamentos/novo?${params.toString()}`;
}

export default function ComparePage() {
  useComparisonSync();
  const navigate = useNavigate();
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [duelMode, setDuelMode] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const { compareItems, removeByIndex, clearCompare, compareCount } = useComparisonStore();
  const { getProductsByIds, products: _cacheSignal } = useProductsContext();
  const ariaMessage = useComparisonAnnouncement(compareCount);

  useComparisonShortcuts({
    onToggleDifferences: () => setDifferencesOnly((v) => !v),
    onToggleRadar: () => setShowRadar((v) => !v),
  });

  const compareEntries = useCompareEntries(compareItems, getProductsByIds, _cacheSignal);
  const products = compareEntries.map((entry) => entry.product);

  const handleCreateQuote = () => navigate(createQuoteUrl(compareItems, client));

  if (compareCount < 2) return <EmptyComparison />;
  return (
    <ActiveComparison
      ariaMessage={ariaMessage}
      shareOpen={shareOpen}
      setShareOpen={setShareOpen}
      compareItems={compareItems}
      client={client}
      setClient={setClient}
      compareCount={compareCount}
      products={products}
      compareEntries={compareEntries}
      differencesOnly={differencesOnly}
      toggleDifferences={() => setDifferencesOnly((value) => !value)}
      createQuote={handleCreateQuote}
      clear={() => {
        clearCompare();
        navigate('/');
      }}
      removeByIndex={removeByIndex}
      showRadar={showRadar}
      duelMode={duelMode}
      toggleDuel={() => setDuelMode((value) => !value)}
      goBack={() => navigate(-1)}
      openProduct={(id) => navigate(`/produto/${id}`)}
    />
  );
}
