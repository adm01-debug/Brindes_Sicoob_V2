import { useState } from "react";
import { useExportJobs, type ExportJob } from "@/hooks/infrastructure/useExportJobs";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText, RefreshCw, Clock, CheckCircle2, AlertCircle, ExternalLink, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Json } from "@/integrations/supabase/types";



interface BatchExportDialogProps {
  entityType: 'orders' | 'quotes';
  filters?: unknown;
}

function serializeFilters(filters: unknown): Json {
  if (filters === undefined) return {};
  return JSON.parse(JSON.stringify(filters)) as Json;
}

export function BatchExportDialog({ entityType, filters }: BatchExportDialogProps) {
  const { jobs = [], scheduledExports = [], isLoading, createJob, retryJob, createScheduledExport, deleteScheduledExport } = useExportJobs();
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('excel');
  const serializedFilters = serializeFilters(filters);
  const downloadJob = async (job: ExportJob) => {
    if (!job.file_path) return;
    const { data, error } = await supabase.storage.from("exports").createSignedUrl(job.file_path, 300);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const entityJobs = jobs.filter(j => j.entity_type === entityType);
  const entityScheduled = scheduledExports.filter(s => s.entity_type === entityType);

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const handleSchedule = () => {
    createScheduledExport({
      entity_type: entityType,
      export_type: exportType,
      frequency,
      filters: serializedFilters,
      is_active: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Exportação em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Exportação em Lote</DialogTitle>
          <DialogDescription>
            Solicite exportações de grandes volumes ou agende envios periódicos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="instant" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instant">Exportação Instantânea</TabsTrigger>
            <TabsTrigger value="scheduled">Agendamento</TabsTrigger>
          </TabsList>

          <TabsContent value="instant" className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2" 
                onClick={() => createJob({ export_type: 'excel', entity_type: entityType, filters: serializedFilters })}
              >
                <FileSpreadsheet className="h-4 w-4" /> Solicitar Excel
              </Button>
              <Button 
                className="flex-1 gap-2" 
                variant="secondary"
                onClick={() => createJob({ export_type: 'pdf', entity_type: entityType, filters: serializedFilters })}
              >
                <FileText className="h-4 w-4" /> Solicitar PDF
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Histórico Recente</h4>
              <ScrollArea className="h-[250px] pr-4">
                {isLoading ? (
                  <div className="py-10 text-center text-muted-foreground">Carregando...</div>
                ) : entityJobs.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg">
                    Sem registros recentes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entityJobs.map((job) => (
                      <div key={job.id} className="p-2 border rounded-md flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <div>
                            <span className="font-medium uppercase">{job.export_type}</span>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(job.created_at), 'dd/MM HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {job.status === 'completed' && job.file_path && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void downloadJob(job)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {job.status === 'failed' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => retryJob(job.id)}>
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4 pt-4">
            <Card className="p-4 border-dashed">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Frequência</label>
                    <Select value={frequency} onValueChange={(value) => setFrequency(value as typeof frequency)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Formato</label>
                    <Select value={exportType} onValueChange={(value) => setExportType(value as typeof exportType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">A conclusão aparecerá nas notificações do portal. O download exige uma sessão autorizada.</p>
                <Button className="w-full gap-2" variant="outline" onClick={handleSchedule}>
                  <Calendar className="h-4 w-4" /> Confirmar Agendamento
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Seus Agendamentos</h4>
              <ScrollArea className="h-[180px] pr-4">
                {entityScheduled.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum agendamento ativo.</p>
                ) : (
                  <div className="space-y-2">
                    {entityScheduled.map((s) => (
                      <div key={s.id} className="p-2 border rounded-md flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium capitalize">{s.frequency} - {s.export_type.toUpperCase()}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Próximo: {s.next_run_at ? format(new Date(s.next_run_at), 'dd/MM') : 'Calculando...'}
                          </p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-destructive hover:text-destructive" 
                          onClick={() => deleteScheduledExport(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
