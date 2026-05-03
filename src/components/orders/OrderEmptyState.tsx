import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface OrderEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function OrderEmptyState({ 
  title = "Nenhum pedido encontrado", 
  description = "Parece que você ainda não tem pedidos neste status ou período.",
  actionLabel = "Novo Pedido",
  onAction
}: OrderEmptyStateProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-muted rounded-2xl bg-muted/5">
      <div className="bg-muted p-4 rounded-full mb-4">
        <PackageOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-xs mt-1 mb-6 text-sm">
        {description}
      </p>
      {onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : (
        <Button onClick={() => navigate("/produtos")}>{actionLabel}</Button>
      )}
    </div>
  );
}
