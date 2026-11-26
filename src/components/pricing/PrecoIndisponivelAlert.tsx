import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Produto vindo do catalogo externo com preco de venda invalido (zero,
 * negativo, infinito ou ausente). O produto continua selecionado para o aviso
 * aparecer, mas a simulacao e a criacao de orcamento ficam bloqueadas: sem isso
 * o item entra no orcamento por R$ 0,00.
 */
export function PrecoIndisponivelAlert({ nome }: { readonly nome: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Produto sem preço de venda no catálogo</AlertTitle>
      <AlertDescription>
        {nome} está sem preço de venda válido no catálogo (zero, negativo,
        infinito ou ausente). A simulação e a criação de orçamento ficam
        bloqueadas até o preço ser corrigido no cadastro do produto.
      </AlertDescription>
    </Alert>
  );
}
