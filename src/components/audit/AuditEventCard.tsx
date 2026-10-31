import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserCircle, History, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AuditEvent {
  event_type?: string | null;
  description?: string | null;
  created_by_name?: string | null;
  actor_role?: string | null;
  created_at?: string | null;
  occurred_at?: string | null;
  observations?: string | null;
  metadata?: { file_url?: string | null } | null;
}

interface AuditEventCardProps {
  event: AuditEvent;
}

export function AuditEventCard({ event }: AuditEventCardProps) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {event.event_type?.replace('_', ' ')}
              </Badge>
              <span className="text-sm font-semibold">{event.description}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCircle className="h-3 w-3" /> {event.created_by_name || 'Sistema'}
                {event.actor_role && (
                  <span className="bg-muted px-1 rounded font-mono text-[10px]">
                    {event.actor_role.toUpperCase()}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" /> 
                {format(new Date(event.created_at ?? event.occurred_at ?? Date.now()), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
          </div>
          {event.metadata?.file_url && (
            <Button variant="link" size="sm" className="gap-1 h-auto p-0" asChild>
              <a href={event.metadata.file_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" /> Arquivo Relacionado
              </a>
            </Button>
          )}
        </div>
        {event.observations && (
          <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded italic">
            "{event.observations}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
