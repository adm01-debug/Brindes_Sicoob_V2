import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  Package,
  PackageSearch,
  Palette,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageSEO } from "@/components/seo/PageSEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const indicadores = [
  {
    rotulo: "Verba disponível",
    valor: "R$ 62.480",
    detalhe: "de R$ 100 mil no ciclo",
    Icone: WalletCards,
    tom: "bg-[#D7F3EF] text-[#005E55]",
  },
  {
    rotulo: "Pedidos em andamento",
    valor: "8",
    detalhe: "3 aguardam sua aprovação",
    Icone: ClipboardCheck,
    tom: "bg-[#E2F0F5] text-[#003641]",
  },
  {
    rotulo: "Entregas neste mês",
    valor: "12",
    detalhe: "96% dentro do prazo",
    Icone: Package,
    tom: "bg-[#E9F3D8] text-[#365314]",
  },
  {
    rotulo: "Economia negociada",
    valor: "R$ 8.740",
    detalhe: "12,4% abaixo da referência",
    Icone: TrendingUp,
    tom: "bg-[#FFF1D6] text-[#7A4900]",
  },
] as const;

const pedidos = [
  { numero: "SCB-2026-0841", campanha: "Semana do Cooperativismo", valor: "R$ 18.420", situacao: "Aprovação", estilo: "bg-amber-100 text-amber-900" },
  { numero: "SCB-2026-0836", campanha: "Boas-vindas novos associados", valor: "R$ 9.780", situacao: "Produção", estilo: "bg-sky-100 text-sky-900" },
  { numero: "SCB-2026-0829", campanha: "Assembleia 2026", valor: "R$ 6.350", situacao: "Em transporte", estilo: "bg-violet-100 text-violet-900" },
] as const;

const atalhos = [
  { titulo: "Encontrar produtos", texto: "Consulte preço, disponibilidade e prazo em um único lugar.", Icone: PackageSearch },
  { titulo: "Montar uma campanha", texto: "Organize itens, quantidades, personalização e público.", Icone: Sparkles },
  { titulo: "Solicitar uma arte", texto: "Envie o briefing e acompanhe cada versão para aprovação.", Icone: Palette },
] as const;

function MarcaDemonstracao() {
  return (
    <div className="rounded-full border border-[#00AE9D]/35 bg-[#E6F7F5] px-3 py-1 text-xs font-semibold text-[#004D45]">
      Demonstração local · dados fictícios
    </div>
  );
}

export default function DemoPortalPage() {
  if (!import.meta.env.DEV) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Demonstração indisponível</h1>
          <p className="text-muted-foreground">Este ambiente existe somente durante o desenvolvimento local.</p>
          <Button asChild><Link to="/login">Voltar para o acesso</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8F7] text-[#163A3C]">
      <PageSEO
        title="Demonstração do portal"
        description="Prévia local do Portal de Compras de Brindes Sicoob."
        path="/demonstracao"
        noIndex
      />

      <header className="sticky top-0 z-30 border-b border-[#D9E7E5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-5 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-[116px] shrink-0 items-center rounded-lg bg-[#003641] px-3">
              <img src="/brand/sicoob-logo.png" alt="Sicoob" className="h-auto w-full" />
            </div>
            <div className="hidden border-l border-[#D9E7E5] pl-3 sm:block">
              <p className="text-sm font-semibold leading-tight text-[#003641]">Portal de brindes</p>
              <p className="text-[11px] text-[#587374]">Cooperativa Vale Verde</p>
            </div>
          </div>

          <label className="relative ml-auto hidden w-full max-w-md md:block">
            <span className="sr-only">Buscar no portal</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4D6869]" />
            <input
              type="search"
              placeholder="Buscar produtos, pedidos ou campanhas"
              className="h-10 w-full rounded-lg border border-[#CADCDA] bg-[#F7FAFA] pl-10 pr-3 text-sm outline-none transition focus:border-[#006C63] focus:ring-2 focus:ring-[#00AE9D]/25"
            />
          </label>

          <MarcaDemonstracao />
          <button aria-label="Notificações, três novas" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#D9E7E5] bg-white text-[#315657] hover:bg-[#F0F7F6]">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F59E0B] ring-2 ring-white" />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#003641] text-sm font-bold text-white">MC</div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-[#163A3C]">Marina Costa</p>
              <p className="text-[11px] text-[#4D6869]">Gerente de PA</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-[#D9E7E5] bg-white px-3 py-6 lg:block">
          <nav aria-label="Navegação da demonstração" className="space-y-1 text-sm">
            <a href="#visao-geral" className="flex items-center gap-3 rounded-lg bg-[#DDF4F1] px-3 py-2.5 font-semibold text-[#005E55]">
              <LayoutDashboard className="h-4 w-4" /> Visão geral
            </a>
            <a href="#catalogo" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#4D6869] hover:bg-[#F0F7F6] hover:text-[#003641]">
              <PackageSearch className="h-4 w-4" /> Catálogo
            </a>
            <a href="#pedidos" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#4D6869] hover:bg-[#F0F7F6] hover:text-[#003641]">
              <ShoppingCart className="h-4 w-4" /> Pedidos
              <span className="ml-auto rounded-full bg-[#E6F7F5] px-2 py-0.5 text-[11px] font-semibold text-[#005E55]">8</span>
            </a>
            <a href="#campanhas" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#4D6869] hover:bg-[#F0F7F6] hover:text-[#003641]">
              <CalendarDays className="h-4 w-4" /> Campanhas
            </a>
            <a href="#resultados" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#4D6869] hover:bg-[#F0F7F6] hover:text-[#003641]">
              <BarChart3 className="h-4 w-4" /> Resultados
            </a>
          </nav>

          <div className="mt-8 rounded-xl bg-[#003641] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7AD7CE]">Próxima campanha</p>
            <p className="mt-2 text-sm font-semibold">Semana do Cooperativismo</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">Entrega planejada para 14 de outubro.</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/85">
              <Clock3 className="h-3.5 w-3.5" /> 33 dias restantes
            </div>
          </div>
        </aside>

        <main id="visao-geral" className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#006C63]">Sexta-feira, 11 de setembro</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#003641] sm:text-3xl">Olá, Marina. O que vamos criar hoje?</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#587374]">Acompanhe sua verba, aprove pedidos e prepare ações para os cooperados.</p>
            </div>
            <Button className="h-11 gap-2 bg-[#003641] text-white hover:bg-[#002B34]" asChild>
              <a href="#catalogo"><PackageSearch className="h-4 w-4" /> Explorar catálogo</a>
            </Button>
          </div>

          <section aria-labelledby="indicadores-titulo">
            <h2 id="indicadores-titulo" className="sr-only">Indicadores principais</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {indicadores.map(({ rotulo, valor, detalhe, Icone, tom }) => (
                <Card key={rotulo} className="border-[#D9E7E5] bg-white shadow-[0_3px_14px_rgba(0,54,65,0.05)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[#4D6869]">{rotulo}</p>
                        <p className="mt-2 text-2xl font-bold tracking-tight text-[#003641]">{valor}</p>
                      </div>
                      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tom}`}><Icone className="h-5 w-5" /></span>
                    </div>
                    <p className="mt-3 text-xs text-[#587374]">{detalhe}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section id="catalogo" aria-labelledby="atalhos-titulo" className="rounded-xl border border-[#D9E7E5] bg-white p-5 shadow-[0_3px_14px_rgba(0,54,65,0.05)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="atalhos-titulo" className="text-lg font-bold text-[#003641]">Comece por aqui</h2>
                  <p className="mt-1 text-sm text-[#4D6869]">Jornadas rápidas para a rotina da cooperativa.</p>
                </div>
                <Badge variant="outline" className="hidden border-[#AEDDD8] bg-[#F0FAF8] text-[#005E55] sm:inline-flex">Catálogo integrado</Badge>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {atalhos.map(({ titulo, texto, Icone }) => (
                  <button key={titulo} className="group rounded-xl border border-[#D9E7E5] bg-[#FAFCFC] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#73C9C0] hover:bg-[#F1FAF9] hover:shadow-md">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#003641] text-white"><Icone className="h-5 w-5" /></span>
                    <span className="mt-4 block text-sm font-semibold text-[#003641]">{titulo}</span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-[#587374]">{texto}</span>
                    <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#007A70]">Começar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                  </button>
                ))}
              </div>
            </section>

            <section id="campanhas" aria-labelledby="verba-titulo" className="rounded-xl bg-[#003641] p-5 text-white shadow-[0_8px_28px_rgba(0,54,65,0.18)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7AD7CE]">Ciclo 2026</p>
                  <h2 id="verba-titulo" className="mt-1 text-lg font-bold">Uso da verba anual</h2>
                </div>
                <WalletCards className="h-5 w-5 text-[#7AD7CE]" />
              </div>
              <p className="mt-6 text-3xl font-bold">37,5%</p>
              <Progress value={37.5} aria-label="37,5% da verba anual utilizada" className="mt-3 h-2 bg-white/15 [&>div]:bg-[#7AD7CE]" />
              <div className="mt-4 flex justify-between text-xs text-white/70">
                <span>Utilizado: R$ 37.520</span><span>Total: R$ 100.000</span>
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.07] p-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7AD7CE]" />
                  <p className="text-xs leading-relaxed text-white/80">O pedido só consome verba quando é confirmado. Cancelamentos elegíveis devolvem o valor automaticamente.</p>
                </div>
              </div>
            </section>
          </div>

          <section id="pedidos" aria-labelledby="pedidos-titulo" className="mt-6 overflow-hidden rounded-xl border border-[#D9E7E5] bg-white shadow-[0_3px_14px_rgba(0,54,65,0.05)]">
            <div className="flex items-center justify-between border-b border-[#E3ECEB] px-5 py-4 sm:px-6">
              <div>
                <h2 id="pedidos-titulo" className="text-lg font-bold text-[#003641]">Pedidos recentes</h2>
                <p className="mt-0.5 text-xs text-[#4D6869]">Acompanhamento consolidado do PA.</p>
              </div>
              <button className="flex min-h-11 items-center gap-1 text-sm font-semibold text-[#007A70] hover:text-[#005E55]">Ver todos <ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="divide-y divide-[#E8EFEE]">
              {pedidos.map((pedido) => (
                <article key={pedido.numero} className="grid gap-3 px-5 py-4 transition hover:bg-[#F8FBFA] sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-center sm:px-6">
                  <div>
                    <p className="text-xs text-[#4D6869]">Pedido</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#003641]">{pedido.numero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4D6869]">Campanha</p>
                    <p className="mt-0.5 text-sm text-[#315657]">{pedido.campanha}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#003641]">{pedido.valor}</p>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${pedido.estilo}`}>{pedido.situacao}</span>
                </article>
              ))}
            </div>
          </section>

          <section id="resultados" className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#B9DED9] bg-[#EAF8F6] p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#CDEEEA] text-[#005E55]"><CheckCircle2 className="h-5 w-5" /></span>
              <div>
                <h2 className="font-bold text-[#003641]">Prévia funcional sem conexão aos bancos</h2>
                <p className="mt-1 max-w-2xl text-sm text-[#4D6869]">Esta tela permite validar arquitetura de informação, hierarquia visual e responsividade. Valores e identidades são sintéticos.</p>
              </div>
            </div>
            <Button variant="outline" className="border-[#73C9C0] bg-white text-[#005E55] hover:bg-[#F7FCFB]" asChild>
              <Link to="/login">Voltar ao acesso</Link>
            </Button>
          </section>
        </main>
      </div>
    </div>
  );
}
