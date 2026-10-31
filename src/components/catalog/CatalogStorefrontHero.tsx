import { ArrowRight, Gift, HeartHandshake, Leaf, PartyPopper, ShieldCheck } from "lucide-react";

const purchaseIntents = [
  {
    label: "Boas-vindas",
    description: "Kits para novos colaboradores e cooperados",
    query: "kit boas-vindas",
    icon: Gift,
    tone: "bg-[#dff4f0] text-[#006c68]",
  },
  {
    label: "Eventos",
    description: "Itens para encontros, feiras e assembleias",
    query: "eventos",
    icon: PartyPopper,
    tone: "bg-[#fff0d8] text-[#8b5200]",
  },
  {
    label: "Relacionamento",
    description: "Presentes para fortalecer vínculos",
    query: "presente",
    icon: HeartHandshake,
    tone: "bg-[#f4e7f3] text-[#7c386f]",
  },
  {
    label: "Sustentáveis",
    description: "Escolhas de menor impacto ambiental",
    query: "sustentável",
    icon: Leaf,
    tone: "bg-[#e9f3dc] text-[#406b22]",
  },
] as const;

const budgetRanges = [
  { label: "Até R$ 25", description: "Lembranças e ações de grande escala", min: 0, max: 25 },
  { label: "R$ 25 a R$ 50", description: "Utilidade com boa presença de marca", min: 25, max: 50 },
  {
    label: "R$ 50 a R$ 100",
    description: "Presentes para públicos estratégicos",
    min: 50,
    max: 100,
  },
  {
    label: "Acima de R$ 100",
    description: "Kits e itens de maior valor percebido",
    min: 100,
    max: 9999,
  },
] as const;

interface CatalogStorefrontHeroProps {
  onBrowse: () => void;
  onSelectIntent: (query: string) => void;
  onSelectBudget: (minimum: number, maximum: number) => void;
}

export function CatalogStorefrontHero({ onBrowse, onSelectIntent, onSelectBudget }: CatalogStorefrontHeroProps) {
  return (
    <section aria-labelledby="storefront-title" className="space-y-7">
      <div className="relative isolate min-h-[31rem] overflow-hidden rounded-[2rem] border border-[#d9e6e3] bg-[#f4f2ea] shadow-[0_24px_70px_-38px_rgba(0,72,77,0.5)] sm:min-h-[34rem] lg:min-h-[31rem]">
        <img
          src="/brand/store/hero-brindes-v1.webp"
          alt="Composição conceitual com mochila, garrafa, caderno e caneca em tons naturais"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f7f4ec] via-[#f7f4ec]/95 to-[#f7f4ec]/5 sm:via-[#f7f4ec]/80 lg:via-[#f7f4ec]/55" />
        <div className="relative z-10 flex min-h-[31rem] max-w-[43rem] flex-col justify-center px-6 py-10 sm:min-h-[34rem] sm:px-10 lg:min-h-[31rem] lg:px-14">
          <span className="mb-5 w-fit rounded-full bg-[#c9f1e9] px-3 py-1 text-xs font-bold tracking-wide text-[#005f5b]">Curadoria para cooperativas</span>
          <h1 id="storefront-title" data-testid="page-title-dashboard" className="max-w-[10ch] font-display text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-[#003f46] sm:text-5xl lg:text-6xl">
            Brindes que aproximam pessoas da sua cooperativa.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#335d61] sm:text-lg">
            Encontre produtos, escolha a personalização e monte seu orçamento com preço, estoque e verba organizados em uma só jornada.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onBrowse}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#00464d] px-6 text-sm font-bold text-white shadow-lg transition hover:bg-[#00363c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a091] focus-visible:ring-offset-2"
            >
              Explorar produtos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="#como-comprar"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#72cec3] bg-white/90 px-6 text-sm font-bold text-[#005d5a] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a091] focus-visible:ring-offset-2"
            >
              Como funciona
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#28595c]" aria-label="Vantagens do portal">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#008b80]" aria-hidden="true" />
              Consulta de estoque
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#008b80]" aria-hidden="true" />
              Personalização guiada
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#008b80]" aria-hidden="true" />
              Controle de verba
            </li>
          </ul>
        </div>
        <span className="absolute bottom-3 right-4 z-10 rounded-full bg-white/75 px-2 py-1 text-[10px] font-medium text-[#365b5e] backdrop-blur-sm">Imagem conceitual</span>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00877c]">Compre pelo seu objetivo</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#003f46] sm:text-3xl">Qual momento você quer tornar especial?</h2>
        <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
          {purchaseIntents.map(({ label, description, query, icon, tone }) => {
            const IntentIcon = icon;
            return <button
              key={label}
              type="button"
              onClick={() => onSelectIntent(query)}
              className="group flex min-h-[7.5rem] min-w-[16rem] snap-start items-center gap-4 rounded-2xl border border-[#d8e5e3] bg-white p-4 text-left shadow-[0_10px_30px_-26px_rgba(0,70,76,0.9)] transition hover:-translate-y-0.5 hover:border-[#79cfc6] hover:shadow-[0_18px_36px_-26px_rgba(0,70,76,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008b80] focus-visible:ring-offset-2 sm:min-w-0"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                <IntentIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-display text-base font-bold text-[#003f46] group-hover:text-[#007d74]">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-[#557276]">{description}</span>
              </span>
            </button>;
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#d8e5e3] bg-white px-5 py-5 shadow-[0_12px_34px_-30px_rgba(0,70,76,0.9)] sm:px-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00877c]">Compre pela sua verba</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-[#003f46] sm:text-2xl">Quanto pretende investir por unidade?</h2>
          </div>
          <p className="max-w-md text-sm leading-5 text-[#557276]">Os valores do catálogo não incluem personalização e podem variar conforme a quantidade.</p>
        </div>
        <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
          {budgetRanges.map(({ label, description, min, max }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelectBudget(min, max)}
              className="group min-h-[4.75rem] min-w-[15rem] snap-start rounded-xl border border-[#d8e5e3] bg-[#f8fbfa] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#79cfc6] hover:bg-[#edf8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008b80] focus-visible:ring-offset-2 sm:min-w-0"
              aria-label={`Filtrar produtos por investimento: ${label}`}
            >
              <span className="block font-display text-sm font-bold text-[#003f46] group-hover:text-[#007d74]">{label}</span>
              <span className="mt-1 block text-xs leading-4 text-[#557276]">{description}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
