import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartCompanyDirectoryResultsProps {
  error: boolean;
  empty: boolean;
  loading: boolean;
  emptyMessage: string;
  emptyClassName?: string;
  onRetry: () => void;
  children: ReactNode;
}

export function CartCompanyDirectoryResults({
  error,
  empty,
  loading,
  emptyMessage,
  emptyClassName = "py-4",
  onRetry,
  children,
}: CartCompanyDirectoryResultsProps) {
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 px-4 py-6 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-xs text-muted-foreground">
          Não foi possível carregar o diretório. Seu perfil pode não ter acesso ou o serviço pode estar indisponível.
        </p>
        <Button variant="ghost" size="sm" onClick={() => void onRetry()}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (empty && !loading) {
    return <p className={`text-xs text-muted-foreground text-center ${emptyClassName}`}>{emptyMessage}</p>;
  }
  return children;
}
