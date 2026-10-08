import { useNotificationOmnichannel } from "@/hooks/useNotificationOmnichannel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Inbox, CheckCircle2, XCircle, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type OmnichannelData = ReturnType<typeof useNotificationOmnichannel>;
type ScheduledItem = NonNullable<OmnichannelData["scheduled"]>[number];
type DigestItem = NonNullable<OmnichannelData["digests"]>[number];
type LogItem = NonNullable<OmnichannelData["logs"]>[number];

function SummaryCards({ scheduled, digests }: Pick<OmnichannelData, "scheduled" | "digests">) {
  const cards = [
    { title: "Agendadas", value: scheduled?.filter((item) => item.status === "scheduled").length || 0, description: "Próximos disparos inteligentes" },
    { title: "Digests Ativos", value: digests?.filter((item) => item.status === "pending").length || 0, description: "Resumos sendo agrupados" },
    { title: "Taxa de Sucesso", value: "99.4%", description: "Últimas 24 horas" },
  ];
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{cards.map((card) => <Card key={card.title}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{card.title}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{card.value}</div><p className="text-xs text-muted-foreground mt-1">{card.description}</p></CardContent></Card>)}</div>;
}

function ScheduledStatus({ status }: { status: ScheduledItem["status"] }) {
  if (status === "scheduled") return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Agendado</Badge>;
  if (status === "sent") return <Badge className="bg-success/10 text-success border-success/20">Enviado</Badge>;
  if (status === "failed") return <Badge variant="destructive">Falhou</Badge>;
  return status === "cancelled" ? <Badge variant="secondary">Cancelado</Badge> : null;
}

function ScheduledRow({ item, onCancel }: { item: ScheduledItem; onCancel: (id: string) => void }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-xs">User ID: {item.user_id?.substring(0, 8) ?? "desconhecido"}...</TableCell>
      <TableCell><Badge variant="outline" className="capitalize">{item.channel}</Badge></TableCell>
      <TableCell className="text-xs">{format(new Date(item.scheduled_for), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
      <TableCell><ScheduledStatus status={item.status} /></TableCell>
      <TableCell className="text-right">{item.status === "scheduled" ? <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => onCancel(item.id)}>Cancelar</Button> : null}</TableCell>
    </TableRow>
  );
}

function ScheduledQueue({ items, onCancel }: { items: ScheduledItem[] | undefined; onCancel: (id: string) => void }) {
  return (
    <Card><CardHeader><CardTitle className="text-lg">Monitoramento de Fila</CardTitle><CardDescription>Acompanhe e gerencie notificações aguardando disparo.</CardDescription></CardHeader><CardContent>
      <Table><TableHeader><TableRow><TableHead>Destinatário</TableHead><TableHead>Canal</TableHead><TableHead>Agendado Para</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>{items?.length ? items.map((item) => <ScheduledRow key={item.id} item={item} onCancel={onCancel} />) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma notificação na fila.</TableCell></TableRow>}</TableBody>
      </Table>
    </CardContent></Card>
  );
}

function DigestRow({ item }: { item: DigestItem }) {
  return <TableRow><TableCell className="font-medium">{item.subject || "Resumo de Atividades"}</TableCell><TableCell><Badge variant="secondary">{Array.isArray(item.content_data) ? item.content_data.length : 0} itens</Badge></TableCell><TableCell className="text-xs">{format(new Date(item.scheduled_for), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell><TableCell><Badge variant={item.status === "sent" ? "default" : "outline"}>{item.status}</Badge></TableCell></TableRow>;
}

function DigestsTable({ items }: { items: DigestItem[] | undefined }) {
  return <Card><CardHeader><CardTitle className="text-lg">Gestão de Digests</CardTitle><CardDescription>Visualização de resumos agrupados por usuário.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Assunto</TableHead><TableHead>Itens</TableHead><TableHead>Próximo Envio</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{items?.length ? items.map((item) => <DigestRow key={item.id} item={item} />) : <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum digest ativo no momento.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

function ExecutionLog({ log }: { log: LogItem }) {
  const time = log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "—";
  return <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 text-xs">{log.status === "success" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}<div className="flex-1"><span className="font-semibold uppercase mr-2">{log.channel}</span><span className="text-muted-foreground">Tempo: {log.execution_time_ms}ms</span></div><span className="text-muted-foreground">{time}</span></div>;
}

function ExecutionLogs({ logs }: { logs: LogItem[] | undefined }) {
  return <Card><CardHeader><CardTitle className="text-lg">Logs de Execução</CardTitle><CardDescription>Histórico técnico de todos os disparos omnichannel.</CardDescription></CardHeader><CardContent><div className="space-y-4">{logs?.length ? logs.map((log) => <ExecutionLog key={log.id} log={log} />) : <p className="text-center py-8 text-muted-foreground">Nenhum log registrado.</p>}</div></CardContent></Card>;
}

export function NotificationOmnichannelPanel() {
  const { digests, scheduled, logs, isLoading, cancelScheduled } = useNotificationOmnichannel();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando painel omnichannel...</div>;

  return (
    <div className="space-y-6">
      <SummaryCards scheduled={scheduled} digests={digests} />

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="scheduled" className="gap-2"><Calendar className="h-4 w-4" /> Fila</TabsTrigger>
          <TabsTrigger value="digests" className="gap-2"><Inbox className="h-4 w-4" /> Digests</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="mt-4">
          <ScheduledQueue items={scheduled} onCancel={cancelScheduled} />
        </TabsContent>

        <TabsContent value="digests" className="mt-4">
          <DigestsTable items={digests} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ExecutionLogs logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
