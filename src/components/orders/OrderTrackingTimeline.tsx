import React from 'react';
import { Truck, Package, CheckCircle, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiLevelTracker } from './MultiLevelTracker';

interface OrderTrackingTimelineProps {
  orderId: string;
  status: string;
}

export function OrderTrackingTimeline({ orderId, status }: OrderTrackingTimelineProps) {
  // Mapping order status to tracking steps
  const getSteps = () => {
    const steps: any[] = [
      { id: 'confirmed', label: 'Pedido Confirmado', status: 'pending' },
      { id: 'in_production', label: 'Em Produção', status: 'pending' },
      { id: 'in_separation', label: 'Em Separação', status: 'pending' },
      { id: 'shipped', label: 'Enviado / Em Transporte', status: 'pending' },
      { id: 'delivered', label: 'Entregue', status: 'pending' },
    ];

    const statusMap: Record<string, number> = {
      'rascunho': -1,
      'enviado_gestor': -1,
      'aprovado_gestor': 0,
      'enviado_vendedor': 0,
      'em_producao': 1,
      'em_separacao': 2,
      'em_transporte': 3,
      'entregue': 4,
      'concluido': 4,
    };

    const currentStepIndex = statusMap[status] ?? -1;

    return steps.map((step, index) => {
      let stepStatus: 'pending' | 'current' | 'completed' | 'failed' = 'pending';
      if (index < currentStepIndex) stepStatus = 'completed';
      else if (index === currentStepIndex) stepStatus = 'current';
      
      return { ...step, status: stepStatus };
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4" /> Status de Rastreamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MultiLevelTracker steps={getSteps()} />
      </CardContent>
    </Card>
  );
}
