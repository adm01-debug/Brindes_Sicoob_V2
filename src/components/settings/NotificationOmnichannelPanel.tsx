import React from "react";
import { useNotificationOmnichannel } from "@/hooks/useNotificationOmnichannel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Inbox, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Send, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationOmnichannelPanel() {
  const { digests, scheduled, logs, isLoading, cancelScheduled } = useNotificationOmnichannel();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando painel omnichannel...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduled?.filter(s => s.status === 'scheduled').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos disparos inteligentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Digests Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{digests?.filter(d => d.status === 'pending').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Resumos sendo agrupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">99.4%</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="scheduled" className="gap-2"><Calendar className="h-4 w-4" /> Fila</TabsTrigger>
          <TabsTrigger value="digests" className="gap-2"><Inbox className="h-4 w-4" /> Digests</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monitoramento de Fila</CardTitle>
              <CardDescription>Acompanhe e gerencie notificações aguardando disparo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Agendado Para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma notificação na fila.</TableCell></TableRow>
                  ) : (
                    scheduled?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-xs">User ID: {item.user_id!.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(item.scheduled_for), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {item.status === 'scheduled' && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Agendado</Badge>}
                          {item.status === 'sent' && <Badge className="bg-success/10 text-success border-success/20">Enviado</Badge>}
                          {item.status === 'failed' && <Badge variant="destructive">Falhou</Badge>}
                          {item.status === 'cancelled' && <Badge variant="secondary">Cancelado</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'scheduled' && (
                            <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => cancelScheduled(item.id)}>Cancelar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="digests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestão de Digests</CardTitle>
              <CardDescription>Visualização de resumos agrupados por usuário.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Próximo Envio</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {digests?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum digest ativo no momento.</TableCell></TableRow>
                  ) : (
                    digests?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.subject || 'Resumo de Atividades'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{Array.isArray(item.content_data) ? item.content_data.length : 0} itens</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(item.scheduled_for), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'sent' ? 'default' : 'outline'}>{item.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logs de Execução</CardTitle>
              <CardDescription>Histórico técnico de todos os disparos omnichannel.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhum log registrado.</p>
                ) : (
                  logs?.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 text-xs">
                      {log.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <div className="flex-1">
                        <span className="font-semibold uppercase mr-2">{log.channel}</span>
                        <span className="text-muted-foreground">Tempo: {log.execution_time_ms}ms</span>
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(log.created_at!), "HH:mm:ss")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
