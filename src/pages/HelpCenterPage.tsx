import { Link } from 'react-router-dom';
import {
  BookOpen,
  Boxes,
  FileText,
  HelpCircle,
  PackageCheck,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { RestartTourButton } from '@/components/onboarding/RestartTourButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { filterByRoutePermission } from '@/lib/navigation/filter-restricted-items';

const QUICK_PATHS = [
  {
    label: 'Explorar catálogo',
    description: 'Busque produtos e aplique filtros comerciais.',
    path: '/filtros',
    icon: Search,
  },
  {
    label: 'Criar orçamento',
    description: 'Monte uma proposta para o cliente.',
    path: '/orcamentos/novo',
    icon: FileText,
  },
  {
    label: 'Montar kit',
    description: 'Combine produtos em um kit personalizado.',
    path: '/montar-kit',
    icon: Boxes,
  },
  {
    label: 'Acompanhar pedidos',
    description: 'Consulte produção, entrega e documentos.',
    path: '/sicoob/pedidos',
    icon: PackageCheck,
  },
] as const;

const FAQ = [
  {
    question: 'Como envio uma proposta para aprovação?',
    answer:
      'Abra o orçamento, revise os itens e use Compartilhar proposta. O sistema gera um link público revogável para copiar ou enviar pelo WhatsApp.',
  },
  {
    question: 'Como encontro um produto mais rápido?',
    answer:
      'Use a busca no topo ou pressione Ctrl+K e escolha Catálogo de Produtos. No catálogo, combine busca, categoria, material, cor, estoque e faixa de preço.',
  },
  {
    question: 'Por que uma ação administrativa não aparece?',
    answer:
      'Recursos administrativos dependem do seu papel e, em operações sensíveis, de autenticação em dois fatores. Solicite a revisão do acesso ao administrador da cooperativa.',
  },
  {
    question: 'O que informar ao pedir suporte?',
    answer:
      'Informe a página, o horário aproximado, o número do orçamento ou pedido e a mensagem exibida. Não envie senhas, tokens ou chaves de acesso.',
  },
] as const;

function QuickPathCards() {
  const { isDev, isAdmin, roles } = useAuth();
  const visiblePaths = filterByRoutePermission(
    QUICK_PATHS,
    (item) => item.path,
    { isDev, isAdmin, assignedRoles: roles },
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visiblePaths.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.path} className="transition-colors hover:border-primary/40">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={item.path}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function KeyboardShortcuts() {
  return (
    <Card id="atalhos">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" /> Atalhos de teclado
        </CardTitle>
        <CardDescription>
          Acesse as tarefas frequentes sem interromper o atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        {[
          ['Ctrl ou ⌘ + K', 'Abrir comandos e navegação'],
          ['Alt + N', 'Criar novo orçamento'],
          ['Alt + O', 'Abrir meus orçamentos'],
          ['Alt + P', 'Abrir produtos'],
        ].map(([shortcut, label]) => (
          <div
            key={shortcut}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <span>{label}</span>
            <kbd className="rounded border bg-muted px-2 py-1 font-mono text-xs">{shortcut}</kbd>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HelpHero() {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <HelpCircle className="h-5 w-5" aria-hidden="true" /> Suporte ao portal
        </div>
        <h1 data-testid="page-title-ajuda" className="font-display text-3xl font-bold tracking-tight">
          Como podemos ajudar?
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Encontre os principais caminhos, reveja o tour e resolva dúvidas comuns sobre catálogo,
          propostas e pedidos.
        </p>
      </div>
      <RestartTourButton />
    </header>
  );
}

function HelpGuidance() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dúvidas frequentes</CardTitle>
          <CardDescription>Orientações para as tarefas mais usadas no dia a dia.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {FAQ.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" /> Precisa de suporte?
          </CardTitle>
          <CardDescription>
            Fale com o administrador responsável pelo portal na sua cooperativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Informe a página, o horário, o número do orçamento ou pedido e a mensagem apresentada.
          </p>
          <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-foreground">
            Nunca compartilhe senha, código de autenticação, token ou chave secreta.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HelpCenterPage() {
  return (
    <>
      <PageSEO
        title="Central de Ajuda"
        description="Guias rápidos para usar o portal Brindes Sicoob."
        path="/ajuda"
        noIndex
      />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-3 py-4 sm:px-6 sm:py-6">
        <HelpHero />
        <section aria-labelledby="atalhos-rapidos">
          <h2 id="atalhos-rapidos" className="mb-3 text-xl font-semibold">
            Atalhos rápidos
          </h2>
          <QuickPathCards />
        </section>
        <HelpGuidance />
        <KeyboardShortcuts />
      </main>
    </>
  );
}
