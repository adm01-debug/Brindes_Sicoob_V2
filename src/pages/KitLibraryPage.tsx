/**
 * Kit Library — Biblioteca unificada de kits do vendedor + sugeridos pelo sistema.
 * 3 abas (Meus / Sugeridos / Favoritos) com busca, filtros visuais, categorias e ordenação.
 * Inclui pin/destaque, ordenação por uso recente e badge de adoção (admin-only).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Library, Sparkles, Star, Pin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PageSEO } from '@/components/seo/PageSEO';
import { KitCard, type KitCardData } from '@/components/kit-library/KitCard';
import { KitCardSkeletonGrid } from '@/components/kit-library/KitCardSkeleton';
import { KitLibraryFilters, type SortOption } from '@/components/kit-library/KitLibraryFilters';
import { KitTemplatePreviewDialog } from '@/components/kit-library/KitTemplatePreviewDialog';
import { KitCategoryChips } from '@/components/kit-library/KitCategoryChips';
import { useKitTemplates, type KitTemplateRow } from '@/hooks/useKitTemplates';
import { useCustomKitPersistence, type CustomKitRow } from '@/hooks/useCustomKitPersistence';
import { useKitShareSummary } from '@/hooks/useKitShare';
import { buildCustomKitInsert } from '@/lib/kit-library/buildCustomKitInsert';

function getItemsCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum: number, it: unknown) => {
    const obj = it as { quantity?: number };
    return sum + (obj?.quantity ?? 1);
  }, 0);
}

function applySort<
  T extends {
    name: string;
    total_price: number;
    updated_at?: string;
    usage_count?: number;
    last_used_at?: string | null;
  },
>(list: T[], sort: SortOption): T[] {
  const arr = [...list];
  switch (sort) {
    case 'price-desc':
      arr.sort((a, b) => Number(b.total_price) - Number(a.total_price));
      break;
    case 'name-asc':
      arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      break;
    case 'usage-desc':
      arr.sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0));
      break;
    case 'last-used':
      arr.sort((a, b) => (b.last_used_at || '').localeCompare(a.last_used_at || ''));
      break;
    case 'recent':
    default:
      arr.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  }
  return arr;
}

interface CustomKitActions {
  edit: (kit: CustomKitRow) => void;
  duplicate: (kit: CustomKitRow) => void;
  remove: (kit: CustomKitRow) => void;
  favorite: (kit: CustomKitRow) => void;
  pin: (kit: CustomKitRow, value: boolean) => void;
}

function getVisibleFilterColors(tab: 'mine' | 'suggested' | 'favorites', colors: string[]) {
  return tab === 'suggested' ? [] : colors;
}

function matchesCustomKit(
  kit: CustomKitRow,
  query: string,
  selectedTag: string | null,
  selectedColor: string | null,
) {
  const searchable = [kit.name, kit.tag ?? ''].join(' ').toLowerCase();
  if (query && !searchable.includes(query)) return false;
  if (selectedTag && kit.tag !== selectedTag) return false;
  if (selectedColor && kit.color !== selectedColor) return false;
  return true;
}

function matchesTemplate(
  template: KitTemplateRow,
  query: string,
  selectedTag: string | null,
  selectedCategory: string | null,
) {
  const searchable = [template.name, template.tag ?? '', template.category].join(' ').toLowerCase();
  if (query && !searchable.includes(query)) return false;
  if (selectedTag && template.tag !== selectedTag) return false;
  if (selectedCategory && template.category !== selectedCategory) return false;
  return true;
}

function CustomKitCard({
  kit,
  data,
  actions,
  pinValue,
}: {
  kit: CustomKitRow;
  data: KitCardData;
  actions: CustomKitActions;
  pinValue: boolean;
}) {
  return (
    <KitCard
      variant="mine"
      data={data}
      onEdit={() => actions.edit(kit)}
      onDuplicate={() => actions.duplicate(kit)}
      onDelete={() => actions.remove(kit)}
      onToggleFavorite={() => actions.favorite(kit)}
      onTogglePin={() => actions.pin(kit, pinValue)}
    />
  );
}

function MineKitsTab({
  isLoading,
  pinnedKit,
  kits,
  hasFilters,
  toCard,
  actions,
  onCreate,
  onShowTemplates,
}: {
  isLoading: boolean;
  pinnedKit: CustomKitRow | null;
  kits: CustomKitRow[];
  hasFilters: boolean;
  toCard: (kit: CustomKitRow) => KitCardData;
  actions: CustomKitActions;
  onCreate: () => void;
  onShowTemplates: () => void;
}) {
  if (isLoading) {
    return <KitCardSkeletonGrid count={8} />;
  }
  if (!pinnedKit && kits.length === 0) {
    return (
      <EmptyState
        icon={<Library className="h-10 w-10" />}
        title={hasFilters ? 'Nenhum kit encontrado' : 'Você ainda não criou kits'}
        description={
          hasFilters
            ? 'Tente ajustar os filtros ou a busca.'
            : 'Comece montando o seu primeiro kit personalizado ou explore os templates do sistema.'
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={onCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Montar kit
            </Button>
            <Button variant="outline" onClick={onShowTemplates} className="gap-2">
              <Sparkles className="h-4 w-4" /> Ver templates
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      {pinnedKit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pin className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Kit em destaque
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <CustomKitCard
              kit={pinnedKit}
              data={toCard(pinnedKit)}
              actions={actions}
              pinValue={false}
            />
          </div>
        </div>
      )}
      {kits.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kits.map((kit) => (
            <CustomKitCard key={kit.id} kit={kit} data={toCard(kit)} actions={actions} pinValue />
          ))}
        </div>
      )}
    </>
  );
}

function SuggestedKitsTab({
  isLoading,
  templates,
  isCloning,
  toCard,
  onSelect,
}: {
  isLoading: boolean;
  templates: KitTemplateRow[];
  isCloning: boolean;
  toCard: (template: KitTemplateRow) => KitCardData;
  onSelect: (template: KitTemplateRow) => void;
}) {
  if (isLoading) return <KitCardSkeletonGrid count={8} />;
  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-10 w-10" />}
        title="Nenhum template encontrado"
        description="Tente outra busca ou aguarde novos templates do sistema."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((template) => (
        <KitCard
          key={template.id}
          variant="template"
          data={toCard(template)}
          isBusy={isCloning}
          onUseTemplate={() => onSelect(template)}
        />
      ))}
    </div>
  );
}

function FavoriteKitsTab({
  kits,
  toCard,
  actions,
}: {
  kits: CustomKitRow[];
  toCard: (kit: CustomKitRow) => KitCardData;
  actions: CustomKitActions;
}) {
  if (kits.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-10 w-10" />}
        title="Sem favoritos ainda"
        description="Marque seus kits favoritos com a estrela para acessá-los rapidamente."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {kits.map((kit) => (
        <CustomKitCard
          key={kit.id}
          kit={kit}
          data={toCard(kit)}
          actions={actions}
          pinValue={!kit.is_pinned}
        />
      ))}
    </div>
  );
}

export default function KitLibraryPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { togglePinned } = useCustomKitPersistence();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'mine' | 'suggested' | 'favorites'>('mine');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('recent');
  const [previewTemplate, setPreviewTemplate] = useState<KitTemplateRow | null>(null);

  // Mine
  const { data: myKits = [], isLoading: loadingMine } = useQuery({
    queryKey: ['custom-kits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CustomKitRow[];
    },
    enabled: !!user?.id,
  });

  // Suggested
  const { templates, isLoading: loadingTemplates, cloneTemplate, isCloning } = useKitTemplates();

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit excluído');
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('custom_kits')
        .update({ is_favorite: value } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-kits'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (kit: CustomKitRow) => {
      if (!user?.id) throw new Error('Não autenticado');
      const payload = buildCustomKitInsert(kit, {
        user_id: user.id,
        name: `${kit.name} (cópia)`,
        status: 'draft',
        is_pinned: false,
        last_used_at: null,
      });
      const { error } = await supabase.from('custom_kits').insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kits'] });
      toast.success('Kit duplicado');
    },
    onError: () => toast.error('Erro ao duplicar'),
  });

  // Derived
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    myKits.forEach((k) => {
      if (k.tag) set.add(k.tag);
    });
    templates.forEach((t) => {
      if (t.tag) set.add(t.tag);
    });
    return Array.from(set).sort();
  }, [myKits, templates]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    myKits.forEach((k) => {
      if (k.color) set.add(k.color);
    });
    return Array.from(set);
  }, [myKits]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [templates]);

  // Filters
  const q = search.trim().toLowerCase();
  const pinnedKit = useMemo(
    () =>
      myKits.find((kit) => kit.is_pinned && matchesCustomKit(kit, q, selectedTag, selectedColor)) ??
      null,
    [myKits, q, selectedTag, selectedColor],
  );

  const filteredMine = useMemo(
    () =>
      applySort(
        myKits.filter(
          (kit) => !kit.is_pinned && matchesCustomKit(kit, q, selectedTag, selectedColor),
        ),
        sort,
      ),
    [myKits, q, selectedTag, selectedColor, sort],
  );
  const filteredFavs = useMemo(
    () =>
      applySort(
        myKits.filter(
          (kit) => kit.is_favorite && matchesCustomKit(kit, q, selectedTag, selectedColor),
        ),
        sort,
      ),
    [myKits, q, selectedTag, selectedColor, sort],
  );
  const filteredTpls = useMemo(
    () =>
      applySort(
        templates.filter((template) => matchesTemplate(template, q, selectedTag, selectedCategory)),
        sort,
      ),
    [templates, q, selectedTag, selectedCategory, sort],
  );

  const { data: shareSummary = {} } = useKitShareSummary();

  const toCard = (k: CustomKitRow): KitCardData => {
    const summary = shareSummary[k.id];
    return {
      id: k.id,
      name: k.name,
      description: k.description,
      tag: k.tag,
      color: k.color || '#3B82F6',
      icon: k.icon || 'Package',
      totalPrice: Number(k.total_price),
      itemsCount: getItemsCount(k.items_data),
      isFavorite: k.is_favorite,
      isPinned: k.is_pinned,
      viewedByClient: !!(summary && summary.viewed > 0),
      lastViewedAt: summary?.lastViewedAt ?? null,
    };
  };

  const tplToCard = (t: KitTemplateRow): KitCardData => ({
    id: t.id,
    name: t.name,
    description: t.description,
    tag: t.tag,
    color: t.color,
    icon: t.icon,
    totalPrice: Number(t.total_price),
    itemsCount: getItemsCount(t.items_data),
    badge: t.usage_count >= 5 ? 'Popular' : t.category,
    usageBadge: isAdmin ? `${t.usage_count} uso${t.usage_count === 1 ? '' : 's'}` : undefined,
  });

  const handleClone = async (template: KitTemplateRow) => {
    const created = await cloneTemplate(template);
    setPreviewTemplate(null);
    if (created && typeof created === 'object' && 'id' in created) {
      navigate(`/montar-kit?kit=${(created as { id: string }).id}`);
    }
  };

  const customKitActions: CustomKitActions = {
    edit: (kit) => navigate(`/montar-kit?kit=${kit.id}`),
    duplicate: (kit) => duplicateMutation.mutate(kit),
    remove: (kit) => setDeleteId(kit.id),
    favorite: (kit) => favoriteMutation.mutate({ id: kit.id, value: !kit.is_favorite }),
    pin: (kit, value) => togglePinned(kit.id, value),
  };

  const hasMineFilters = Boolean(q || selectedTag || selectedColor);
  const visibleFilterColors = getVisibleFilterColors(tab, availableColors);

  return (
    <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-4 px-3 py-4 pb-24 sm:px-4 md:pb-6 lg:px-6 xl:px-8">
      <PageSEO
        title="Biblioteca de Kits — Seus kits salvos e templates do sistema"
        description="Acesse seu banco pessoal de kits e clone templates curados pelo sistema para acelerar a montagem de propostas."
        path="/meus-kits"
        noIndex
      />

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1
            data-testid="page-title-kits"
            className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight"
          >
            <Library className="h-7 w-7 text-primary" />
            Biblioteca de Kits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse seus kits salvos ou clone um template do sistema para acelerar sua rotina.
          </p>
        </div>
        <Button onClick={() => navigate('/montar-kit')} className="gap-2">
          <Plus className="h-4 w-4" /> Montar novo kit
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar kits"
          placeholder="Buscar por nome, etiqueta ou categoria…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <KitLibraryFilters
        tags={availableTags}
        colors={visibleFilterColors}
        selectedTag={selectedTag}
        selectedColor={selectedColor}
        sort={sort}
        onTagChange={setSelectedTag}
        onColorChange={setSelectedColor}
        onSortChange={setSort}
        showUsageSort={tab === 'suggested'}
        showLastUsedSort={tab !== 'suggested'}
      />

      {tab === 'suggested' && (
        <KitCategoryChips
          categories={availableCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine" className="gap-2">
            <Library className="h-4 w-4" /> Meus Kits
            <span className="ml-1 text-[10px] opacity-60">({myKits.length})</span>
          </TabsTrigger>
          <TabsTrigger value="suggested" className="gap-2">
            <Sparkles className="h-4 w-4" /> Sugeridos
            <span className="ml-1 text-[10px] opacity-60">({templates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Star className="h-4 w-4" /> Favoritos
            <span className="ml-1 text-[10px] opacity-60">
              ({myKits.filter((k) => k.is_favorite).length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-4">
          <MineKitsTab
            isLoading={loadingMine}
            pinnedKit={pinnedKit}
            kits={filteredMine}
            hasFilters={hasMineFilters}
            toCard={toCard}
            actions={customKitActions}
            onCreate={() => navigate('/montar-kit')}
            onShowTemplates={() => setTab('suggested')}
          />
        </TabsContent>

        <TabsContent value="suggested">
          <SuggestedKitsTab
            isLoading={loadingTemplates}
            templates={filteredTpls}
            isCloning={isCloning}
            toCard={tplToCard}
            onSelect={setPreviewTemplate}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <FavoriteKitsTab kits={filteredFavs} toCard={toCard} actions={customKitActions} />
        </TabsContent>
      </Tabs>

      {/* Preview template */}
      <KitTemplatePreviewDialog
        template={previewTemplate}
        allTemplates={templates}
        open={!!previewTemplate}
        onOpenChange={(o) => !o && setPreviewTemplate(null)}
        onClone={() => previewTemplate && handleClone(previewTemplate)}
        onSelectRelated={(t) => setPreviewTemplate(t)}
        isCloning={isCloning}
      />

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          {icon}
        </div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
