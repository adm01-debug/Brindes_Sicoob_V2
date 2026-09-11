import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Heart,
  LayoutDashboard,
  Leaf,
  Menu,
  PackageCheck,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageSEO } from "@/components/seo/PageSEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import demoProductsImage from "@/assets/demo/produtos-grid-v1.webp";

type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  unitPrice: number;
  minimum: number;
  availability: string;
  categories: string[];
  position: string;
  highlight?: string;
  colors: string[];
};

const products: Product[] = [
  {
    id: "garrafa",
    name: "Garrafa térmica Urban 500 ml",
    description: "Aço inox, parede dupla e gravação a laser.",
    price: "R$ 47,90",
    unitPrice: 47.9,
    minimum: 30,
    availability: "Disponibilidade imediata",
    categories: ["Todos", "Sustentáveis", "Eventos"],
    position: "0% 0%",
    highlight: "Mais pedido",
    colors: ["#003641", "#F4F1EA", "#1E293B"],
  },
  {
    id: "mochila",
    name: "Mochila executiva Horizonte",
    description: "Compartimento para notebook e tecido resistente à água.",
    price: "R$ 129,00",
    unitPrice: 129,
    minimum: 20,
    availability: "Produção em até 12 dias",
    categories: ["Todos", "Onboarding", "Premium"],
    position: "100% 0%",
    highlight: "Escolha premium",
    colors: ["#153C38", "#252A2E", "#6B7280"],
  },
  {
    id: "caderno",
    name: "Caderno Eco com caneta",
    description: "Capa kraft, 80 folhas e papel de origem responsável.",
    price: "R$ 24,80",
    unitPrice: 24.8,
    minimum: 50,
    availability: "Disponibilidade imediata",
    categories: ["Todos", "Sustentáveis", "Onboarding"],
    position: "0% 100%",
    highlight: "Sustentável",
    colors: ["#B98755", "#003641", "#D8C7A8"],
  },
  {
    id: "cafe",
    name: "Kit Café Boas Conversas",
    description: "Caneca térmica, café especial e embalagem presenteável.",
    price: "R$ 86,50",
    unitPrice: 86.5,
    minimum: 20,
    availability: "Produção em até 10 dias",
    categories: ["Todos", "Onboarding", "Eventos", "Premium"],
    position: "100% 100%",
    highlight: "Novo",
    colors: ["#0F4C45", "#C08A50", "#F4F1EA"],
  },
];

const categories = ["Todos", "Sustentáveis", "Onboarding", "Eventos", "Premium"];

const occasions = [
  { title: "Boas-vindas", detail: "Kits para novos colaboradores e cooperados", icon: ShoppingBag, tone: "bg-[#E3F5F2] text-[#005E55]" },
  { title: "Eventos", detail: "Itens úteis para encontros e assembleias", icon: Sparkles, tone: "bg-[#FFF0D6] text-[#774600]" },
  { title: "Relacionamento", detail: "Presentes para fortalecer vínculos", icon: Heart, tone: "bg-[#F4EAF4] text-[#67345F]" },
  { title: "Sustentáveis", detail: "Escolhas de menor impacto", icon: Leaf, tone: "bg-[#EAF3DC] text-[#365314]" },
] as const;

const budgetRanges = [
  { label: "Até R$ 25", detail: "Lembranças e ações de grande escala", min: 0, max: 25 },
  { label: "R$ 25 a R$ 50", detail: "Utilidade com boa presença de marca", min: 25, max: 50 },
  { label: "R$ 50 a R$ 100", detail: "Presentes para públicos estratégicos", min: 50, max: 100 },
  { label: "Acima de R$ 100", detail: "Kits e itens de maior valor percebido", min: 100, max: Number.POSITIVE_INFINITY },
] as const;

const purchaseSteps = [
  { number: "1", title: "Escolha", detail: "Selecione produtos e quantidades.", icon: PackageCheck },
  { number: "2", title: "Personalize", detail: "Defina aplicação e envie a marca.", icon: Palette },
  { number: "3", title: "Valide", detail: "Confira prazo, arte e orçamento.", icon: ShieldCheck },
  { number: "4", title: "Acompanhe", detail: "Siga a produção até a entrega.", icon: Truck },
] as const;

function ProductImage({ product }: { product: Product }) {
  return (
    <div
      role="img"
      aria-label={`Foto ilustrativa de ${product.name}`}
      className="aspect-square w-full bg-[#F6F4EE] bg-[length:200%_200%] bg-no-repeat transition-transform duration-500 group-hover:scale-[1.025]"
      style={{
        backgroundImage: `url('${demoProductsImage}')`,
        backgroundPosition: product.position,
      }}
    />
  );
}

export default function StorefrontDemoPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeBudget, setActiveBudget] = useState<(typeof budgetRanges)[number] | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const visibleProducts = useMemo(
    () => products.filter((product) => (
      product.categories.includes(activeCategory)
      && (!activeBudget || (product.unitPrice >= activeBudget.min && product.unitPrice <= activeBudget.max))
    )),
    [activeBudget, activeCategory],
  );
  const selected = products.filter((product) => selectedProducts.includes(product.id));

  const toggleSelected = (productId: string) => {
    setSelectedProducts((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const scrollToQuote = () => document.getElementById("orcamento-demo")?.scrollIntoView({ behavior: "smooth" });

  if (!import.meta.env.DEV) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Loja demonstrativa indisponível</h1>
          <p className="text-muted-foreground">Este ambiente existe somente durante o desenvolvimento local.</p>
          <Button asChild><Link to="/login">Voltar para o acesso</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FAF9] text-[#173E40]">
      <PageSEO
        title="Loja demonstrativa"
        description="Prévia local da experiência de compras e orçamentos do Portal Sicoob."
        path="/loja-demo"
        noIndex
      />

      <aside aria-label="Aviso do ambiente" className="bg-[#003641] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white sm:text-xs">
        Demonstração local com produtos, preços e disponibilidade fictícios
      </aside>

      <header className="sticky top-0 z-40 border-b border-[#D8E7E5] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-6 lg:px-8">
          <button aria-label="Abrir menu" className="grid h-11 w-11 place-items-center rounded-full border border-[#D6E4E2] text-[#315657] lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/loja-demo" aria-label="Página inicial da loja" className="flex h-11 w-[126px] shrink-0 items-center rounded-lg bg-[#003641] px-3">
            <img src="/brand/sicoob-logo.png" alt="Sicoob" className="h-auto w-full" />
          </Link>

          <label className="relative order-last w-full lg:order-none lg:flex-1">
            <span className="sr-only">O que você está procurando?</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#49696A]" />
            <input
              type="search"
              placeholder="Busque por produto, ocasião ou faixa de preço"
              className="h-11 w-full rounded-full border border-[#C9DBD9] bg-[#F7FAF9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#5C7778] focus:border-[#007A70] focus:bg-white focus:ring-2 focus:ring-[#00AE9D]/20"
            />
          </label>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button asChild variant="ghost" className="hidden h-11 gap-2 text-[#315657] hover:bg-[#EAF7F5] xl:flex">
              <Link to="/demonstracao"><LayoutDashboard className="h-4 w-4" /> Área de gestão</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={scrollToQuote}
              className="relative h-11 gap-2 rounded-full border-[#8FCFC8] px-3 text-[#005E55] hover:bg-[#EAF7F5] sm:px-4"
              aria-label={`Abrir orçamento com ${selected.length} produto${selected.length === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Meu orçamento</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#003641] px-1 text-[10px] font-bold text-white">{selected.length}</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Categorias principais" className="border-t border-[#E5EFED] bg-white">
          <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-4 py-1.5 text-sm [scrollbar-width:none] sm:px-6 lg:px-8">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveCategory(category);
                  setActiveBudget(null);
                }}
                aria-pressed={activeCategory === category}
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-4 font-medium transition",
                  activeCategory === category
                    ? "bg-[#DDF4F1] text-[#005E55]"
                    : "text-[#49696A] hover:bg-[#F1F7F6] hover:text-[#003641]",
                )}
              >
                {category}
              </button>
            ))}
            <button className="ml-auto hidden min-h-10 shrink-0 items-center gap-1 px-3 font-medium text-[#315657] lg:flex">
              Todas as categorias <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="relative isolate min-h-[500px] overflow-hidden rounded-[28px] bg-[#EAE7DE] shadow-[0_12px_38px_rgba(0,54,65,0.12)] lg:min-h-[550px]">
            <img
              src="/brand/store/hero-brindes-v1.webp"
              alt="Seleção ilustrativa de mochila, garrafa, caderno e caneca em tons de verde"
              className="absolute inset-0 h-full w-full object-cover object-[63%_center] sm:object-center"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7F4ED] via-[#F7F4ED]/95 to-[#F7F4ED]/0 sm:via-[#F7F4ED]/75" />
            <div className="relative flex min-h-[500px] max-w-xl flex-col justify-center p-7 sm:p-12 lg:min-h-[550px] lg:p-16">
              <Badge className="mb-5 w-fit border-0 bg-[#CDEEE9] text-[#004D45] hover:bg-[#CDEEE9]">
                Curadoria para cooperativas
              </Badge>
              <h1 className="max-w-lg text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-[#003641] sm:text-5xl lg:text-6xl">
                Brindes que aproximam pessoas da sua cooperativa.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#385C5D] sm:text-lg">
                Encontre, personalize e solicite seu orçamento com preço, prazo e verba organizados em uma jornada simples.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button className="h-12 gap-2 rounded-full bg-[#003641] px-6 text-white shadow-lg shadow-[#003641]/15 hover:bg-[#002B34]" asChild>
                  <a href="#produtos-demo">Explorar produtos <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button variant="outline" className="h-12 rounded-full border-[#89C9C2] bg-white/75 px-6 text-[#005E55] backdrop-blur hover:bg-white" asChild>
                  <a href="#como-funciona">Como funciona</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#315657]">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#007A70]" /> Consulta de estoque</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#007A70]" /> Personalização guiada</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#007A70]" /> Controle de verba</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="ocasioes-titulo" className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007A70]">Compre pelo seu objetivo</p>
            <h2 id="ocasioes-titulo" className="mt-1.5 text-2xl font-bold tracking-tight text-[#003641] sm:text-3xl">Qual momento você quer tornar especial?</h2>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
            {occasions.map(({ title, detail, icon: Icon, tone }) => (
              <button key={title} className="group flex min-h-[118px] min-w-[16rem] snap-start items-center gap-4 rounded-2xl border border-[#D7E5E3] bg-white p-4 text-left shadow-[0_3px_14px_rgba(0,54,65,0.04)] transition hover:-translate-y-0.5 hover:border-[#8FCFC8] hover:shadow-lg sm:min-w-0">
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tone)}><Icon className="h-5 w-5" /></span>
                <span>
                  <span className="flex items-center gap-1 text-sm font-bold text-[#003641]">{title} <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" /></span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#4D6869]">{detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="verba-titulo" className="mx-auto max-w-[1500px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#D7E5E3] bg-white p-5 shadow-[0_3px_14px_rgba(0,54,65,0.04)] sm:p-6">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007A70]">Compre pela sua verba</p>
                <h2 id="verba-titulo" className="mt-1.5 text-xl font-bold tracking-tight text-[#003641] sm:text-2xl">Quanto pretende investir por unidade?</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-[#4D6869]">Valores sem personalização e sujeitos à quantidade mínima de cada produto.</p>
            </div>
            <div className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
              {budgetRanges.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => {
                    setActiveCategory("Todos");
                    setActiveBudget(range);
                    requestAnimationFrame(() => document.getElementById("produtos-demo")?.scrollIntoView({ behavior: "smooth" }));
                  }}
                  aria-pressed={activeBudget?.label === range.label}
                  className={cn(
                    "group min-h-[76px] min-w-[15rem] snap-start rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007A70] focus-visible:ring-offset-2 sm:min-w-0",
                    activeBudget?.label === range.label
                      ? "border-[#007A70] bg-[#E3F5F2]"
                      : "border-[#D7E5E3] bg-[#F8FBFA] hover:border-[#8FCFC8] hover:bg-[#EFF8F6]",
                  )}
                >
                  <span className="block text-sm font-bold text-[#003641] group-hover:text-[#006C63]">{range.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#4D6869]">{range.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="produtos-demo" aria-labelledby="produtos-titulo" className="bg-white py-11">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007A70]">Seleção recomendada</p>
                <h2 id="produtos-titulo" className="mt-1.5 text-2xl font-bold tracking-tight text-[#003641] sm:text-3xl">Produtos para a sua próxima ação</h2>
                <p className="mt-2 text-sm text-[#4D6869]">Valores ilustrativos por unidade, sem personalização e conforme quantidade mínima.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4D6869]">
                {activeBudget && (
                  <button
                    type="button"
                    onClick={() => setActiveBudget(null)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#E3F5F2] px-3 text-xs font-semibold text-[#005E55] hover:bg-[#D4EEEA]"
                    aria-label={`Remover filtro ${activeBudget.label}`}
                  >
                    {activeBudget.label} <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                <span>{visibleProducts.length} produtos</span>
                <Button variant="outline" size="sm" className="rounded-full border-[#C9DBD9]">Mais filtros</Button>
              </div>
            </div>

            <div aria-live="polite" className="mt-6 grid grid-cols-1 gap-5 min-[430px]:grid-cols-2 xl:grid-cols-4">
              {visibleProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                const isFavorite = favorites.includes(product.id);
                return (
                  <article key={product.id} className="group overflow-hidden rounded-2xl border border-[#D8E6E4] bg-white shadow-[0_4px_18px_rgba(0,54,65,0.05)] transition hover:-translate-y-1 hover:border-[#9BD4CE] hover:shadow-[0_14px_32px_rgba(0,54,65,0.11)]">
                    <div className="relative overflow-hidden">
                      <ProductImage product={product} />
                      {product.highlight && <span className="absolute left-3 top-3 rounded-full bg-[#003641] px-2.5 py-1 text-[10px] font-bold text-white">{product.highlight}</span>}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        aria-label={`${isFavorite ? "Remover" : "Adicionar"} ${product.name} ${isFavorite ? "dos" : "aos"} favoritos`}
                        aria-pressed={isFavorite}
                        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-black/5 bg-white/90 text-[#315657] shadow-sm backdrop-blur transition hover:text-[#007A70]"
                      >
                        <Heart className={cn("h-4 w-4", isFavorite && "fill-[#007A70] text-[#007A70]")} />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-semibold text-[#006C63]">{product.availability}</p>
                      <h3 className="mt-1.5 min-h-10 text-sm font-bold leading-snug text-[#003641]">{product.name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-[#4D6869]">{product.description}</p>
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-[#4D6869]">A partir de</p>
                          <p className="text-xl font-bold tracking-tight text-[#003641]">{product.price}</p>
                          <p className="text-[10px] text-[#4D6869]">Mínimo: {product.minimum} unidades</p>
                        </div>
                        <div role="img" className="flex -space-x-1" aria-label={`${product.colors.length} cores disponíveis`}>
                          {product.colors.map((color) => <span key={color} className="h-4 w-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => toggleSelected(product.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "mt-4 h-11 w-full gap-2 rounded-full",
                          isSelected
                            ? "bg-[#006C63] text-white hover:bg-[#005E55]"
                            : "bg-[#003641] text-white hover:bg-[#002B34]",
                        )}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                        {isSelected ? "Adicionado" : "Adicionar ao orçamento"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[28px] bg-[#003641] px-6 py-9 text-white sm:px-10 lg:px-14 lg:py-12">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7AD7CE]">Do produto ao pedido</p>
                <h2 id="como-funciona-titulo" className="mt-2 text-3xl font-bold tracking-tight">Comprar ficou mais simples e seguro.</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">A cooperativa acompanha cada decisão, enquanto o portal organiza disponibilidade, personalização, aprovação e verba.</p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {purchaseSteps.map(({ number, title, detail, icon: Icon }) => (
                  <li key={number} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <div className="flex items-center justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#7AD7CE] text-xs font-bold text-[#003641]">{number}</span>
                      <Icon className="h-5 w-5 text-[#7AD7CE]" />
                    </div>
                    <p className="mt-5 text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/70">{detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="orcamento-demo" aria-labelledby="orcamento-titulo" className="scroll-mt-36 border-t border-[#D8E6E4] bg-[#EDF7F5] py-12">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007A70]">Seu orçamento</p>
              <h2 id="orcamento-titulo" className="mt-1.5 text-2xl font-bold text-[#003641]">
                {selected.length === 0 ? "Comece selecionando seus produtos" : `${selected.length} produto${selected.length === 1 ? "" : "s"} selecionado${selected.length === 1 ? "" : "s"}`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4D6869]">
                {selected.length === 0
                  ? "Adicione itens para simular a montagem do pedido. Nenhuma informação será enviada."
                  : "Na jornada real, o próximo passo confirma quantidade, personalização, endereço e disponibilidade antes de solicitar aprovação."}
              </p>
              {selected.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
                  {selected.map((product) => (
                    <button key={product.id} onClick={() => toggleSelected(product.id)} className="flex min-h-10 items-center gap-2 rounded-full border border-[#A9D8D3] bg-white px-3 text-xs font-semibold text-[#315657] hover:border-[#007A70]">
                      {product.name}<X className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Remover</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button disabled={selected.length === 0} className="h-12 gap-2 rounded-full bg-[#003641] px-7 text-white hover:bg-[#002B34] disabled:bg-[#789091]">
              Continuar orçamento <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section aria-label="Compromissos do portal" className="bg-white py-7">
          <div className="mx-auto grid max-w-[1200px] gap-5 px-4 text-sm sm:grid-cols-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-[#007A70]" /><span><strong className="block text-[#003641]">Informação centralizada</strong><span className="text-xs text-[#4D6869]">Preço, disponibilidade e histórico</span></span></div>
            <div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-[#007A70]" /><span><strong className="block text-[#003641]">Verba protegida</strong><span className="text-xs text-[#4D6869]">Débito somente após confirmação</span></span></div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#007A70]" /><span><strong className="block text-[#003641]">Aprovação rastreável</strong><span className="text-xs text-[#4D6869]">Papéis e alçadas por cooperativa</span></span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
