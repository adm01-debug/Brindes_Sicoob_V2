import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateQuoteStatusAtomically } from '@/services/quoteStatusTransition';

interface ReopenExpiredQuoteButtonProps {
  quoteId: string;
  status: string;
  isLatestVersion?: boolean;
  onReopened?: () => void;
}

export function ReopenExpiredQuoteButton({
  quoteId,
  status,
  isLatestVersion = true,
  onReopened,
}: ReopenExpiredQuoteButtonProps) {
  const navigate = useNavigate();
  const [reopening, setReopening] = useState(false);

  if (status !== 'expired' || !isLatestVersion) return null;

  const handleReopen = async () => {
    if (reopening) return;
    setReopening(true);
    try {
      await updateQuoteStatusAtomically(
        quoteId,
        'draft',
        'Orçamento expirado reaberto para revisão comercial',
      );
      onReopened?.();
      toast.success('Orçamento reaberto como rascunho');
      navigate(`/orcamentos/${quoteId}/editar`);
    } catch (error) {
      toast.error('Não foi possível reabrir o orçamento', {
        description:
          error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
      });
    } finally {
      setReopening(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      disabled={reopening}
      onClick={handleReopen}
    >
      {reopening ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      )}
      {reopening ? 'Reabrindo...' : 'Reabrir e editar'}
    </Button>
  );
}
