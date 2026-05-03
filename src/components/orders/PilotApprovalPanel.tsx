import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, XCircle, Clock } from "lucide-react";
import { type OrderRow } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PilotApprovalPanelProps {
  order: OrderRow;
}

export function PilotApprovalPanel({ order }: PilotApprovalPanelProps) {
  // Mock pilot status
  const pilotStatus = (order as any).pilot_status || 'pendente';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> Aprovação de Piloto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden group">
          <Camera className="h-8 w-8 text-muted-foreground opacity-30 group-hover:scale-110 transition-transform" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Button size="sm" variant="secondary">Ver Foto do Piloto</Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium">Status do Piloto</span>
          </div>
          <Badge variant={pilotStatus === 'aprovado' ? 'success' : 'outline'}>
            {pilotStatus === 'aprovado' ? 'Aprovado' : 'Aguardando'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1">
            <XCircle className="h-3 w-3" /> Reprovar
          </Button>
          <Button variant="default" size="sm" className="h-8 text-[10px] gap-1">
            <CheckCircle className="h-3 w-3" /> Aprovar Piloto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
