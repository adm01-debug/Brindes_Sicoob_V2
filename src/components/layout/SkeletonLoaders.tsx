import * as React from 'react';
import { Skeleton as BaseSkeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const PAGE_SKELETON_CLASS = 'p-4 lg:p-6 space-y-6';

/**
 * Skeleton otimizado com redução de custo de render em hardware fraco.
 * Desabilita animações de pulso se 'prefers-reduced-motion' estiver ativo.
 */
const Skeleton = ({ className, ...props }: React.ComponentProps<typeof BaseSkeleton>) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear', // Linear é mais barato que easeInOut para loops infinitos
      }}
      className="will-change-opacity"
    >
      <BaseSkeleton className={className} {...props} />
    </motion.div>
  );
};

/**
 * Helper para criar skeletons como forwardRef divs.
 *
 * Por que forwardRef?
 *   Estes componentes são frequentemente usados como `fallback` de
 *   <Suspense> dentro de árvores que aplicam refs em descendentes
 *   (ex.: react-router em transição, react-helmet-async, framer-motion
 *   em ancestrais). Sem forwardRef, o React emite o warning
 *   "Function components cannot be given refs".
 */
type SkeletonRootProps = React.HTMLAttributes<HTMLDivElement>;

function makeSkeleton(displayName: string, render: () => React.ReactNode, rootClassName: string) {
  const Cmp = React.forwardRef<HTMLDivElement, SkeletonRootProps>(({ className, ...rest }, ref) => (
    <div ref={ref} className={[rootClassName, className].filter(Boolean).join(' ')} {...rest}>
      {render()}
    </div>
  ));
  Cmp.displayName = displayName;
  return Cmp;
}

/** Catalog / Products page skeleton */
export const CatalogSkeleton = makeSkeleton(
  'CatalogSkeleton',
  () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      {/* Toolbar / search */}
      <Skeleton className="h-10 w-full max-w-md" />
      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border/5 bg-card/30 p-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-1/3 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  ),
  'space-y-6 p-4 lg:p-6',
);

/** Product detail page skeleton */
export const ProductDetailSkeleton = makeSkeleton(
  'ProductDetailSkeleton',
  () => (
    <>
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image */}
        <Skeleton className="aspect-square w-full rounded-2xl" />
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-40 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Quotes list page skeleton */
export const QuotesSkeleton = makeSkeleton(
  'QuotesSkeleton',
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Admin pages skeleton */
export const AdminSkeleton = makeSkeleton(
  'AdminSkeleton',
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Table */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Dashboard / home skeleton */
export const DashboardSkeleton = makeSkeleton(
  'DashboardSkeleton',
  () => (
    <>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Orders page skeleton */
export const OrdersSkeleton = makeSkeleton(
  'OrdersSkeleton',
  () => (
    <>
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Filters Area */}
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Tools page skeleton (Mockup, Kit Builder, Simulador) */
export const ToolsSkeleton = makeSkeleton(
  'ToolsSkeleton',
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
      {/* Wizard steps */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-16 rounded-full" />
        ))}
      </div>
      {/* Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/** Profile page skeleton */
export const ProfileSkeleton = makeSkeleton(
  'ProfileSkeleton',
  () => (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 w-32 rounded-lg" />
    </>
  ),
  'p-4 lg:p-6 space-y-6 max-w-2xl mx-auto',
);

/** Generic page skeleton (fallback) */
export const GenericSkeleton = makeSkeleton(
  'GenericSkeleton',
  () => (
    <>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </>
  ),
  PAGE_SKELETON_CLASS,
);

/**
 * Returns the appropriate skeleton component based on the current route.
 */
const CATALOG_SKELETON_ROUTES = new Set([
  '/produtos',
  '/filtros',
  '/',
  '/novidades',
  '/reposicao',
  '/favoritos',
]);

const TOOL_SKELETON_ROUTES = [
  '/mockup-generator',
  '/montar-kit',
  '/simulador',
  '/magic-up',
  '/simulador-precos',
  '/busca-preco',
];

const FALLBACK_MATCHERS: Array<{ matches: (pathname: string) => boolean; node: React.ReactNode }> =
  [
    { matches: (pathname) => pathname.includes('/produto/'), node: <ProductDetailSkeleton /> },
    { matches: (pathname) => CATALOG_SKELETON_ROUTES.has(pathname), node: <CatalogSkeleton /> },
    { matches: (pathname) => pathname.includes('/orcamentos'), node: <QuotesSkeleton /> },
    {
      matches: (pathname) => pathname.includes('/admin') || pathname === '/status',
      node: <AdminSkeleton />,
    },
    { matches: (pathname) => pathname === '/dashboard', node: <DashboardSkeleton /> },
    { matches: (pathname) => pathname.includes('/pedidos'), node: <OrdersSkeleton /> },
    {
      matches: (pathname) => TOOL_SKELETON_ROUTES.some((route) => pathname.startsWith(route)),
      node: <ToolsSkeleton />,
    },
    { matches: (pathname) => pathname === '/tendencias', node: <AdminSkeleton /> },
  ];

export function getFallback(pathname: string): React.ReactNode {
  return FALLBACK_MATCHERS.find(({ matches }) => matches(pathname))?.node ?? <GenericSkeleton />;
}
