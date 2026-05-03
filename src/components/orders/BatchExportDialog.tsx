import { useState } from "react";
import { useExportJobs, ExportJob } from "@/hooks/useExportJobs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, RefreshCw, Clock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BatchExportDialogProps {
  entityType: 'orders' | 'quotes';
  filters?: any;
}

export function BatchExportDialog({ entityType, filters }: BatchExportDialogProps) {
  const { jobs = [], isLoading, createJob, retryJob } = useExportJobs();
  const [open, setOpen] = useState(false);

  const entityJobs = jobs.filter(j => j.entity_type === entityType);

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
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
            Solicite exportações de grandes volumes. Os arquivos serão gerados em segundo plano.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-6">
          <Button 
            className="flex-1 gap-2" 
            onClick={() => createJob({ export_type: 'excel', entity_type: entityType, filters })}
          >
            <FileSpreadsheet className="h-4 w-4" /> Solicitar Excel
          </Button>
          <Button 
            className="flex-1 gap-2" 
            variant="secondary"
            onClick={() => createJob({ export_type: 'pdf', entity_type: entityType, filters })}
          >
            <FileText className="h-4 w-4" /> Solicitar PDF
          </Button>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Histórico de Exportações</h4>
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando histórico...</div>
            ) : entityJobs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg">
                Nenhuma exportação solicitada recentemente.
              </div>
            ) : (
              <div className="space-y-3">
                {entityJobs.map((job) => (
                  <div key={job.id} className="p-3 border rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium uppercase">{job.export_type}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {format(new Date(job.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {job.status === 'completed' 
                            ? `${job.total_count} registros processados` 
                            : job.status === 'failed' 
                              ? `Erro: ${job.error_message}`
                              : 'Aguardando processamento...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && job.file_url && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                          <a href={job.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => retryJob(job.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
