/**
 * KitShareLinkDialog — gera/copia link público + lista e revoga links existentes.
 * Aba "Gerar" cria novo token; aba "Links" mostra ativos com revogação.
 */
import { useState } from 'react';
import { Share2, Copy, Check, Loader2, ExternalLink, Eye, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitShare, useKitShareTokens, type KitShareToken } from '@/hooks/useKitShare';
import { toast } from 'sonner';

interface Props {
  kitId: string | undefined;
  kitName: string;
}

function displayKitName(kitName: string) {
  return kitName.length > 0 ? kitName : 'seu kit';
}

export function KitShareLinkDialog({ kitId, kitName }: Props) {
  const { generateShareLink, revokeShareLink, isLoading } = useKitShare();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'generate' | 'links'>('generate');

  const { data: tokens = [], isLoading: loadingTokens } = useKitShareTokens(open ? kitId : undefined);

  const disabled = !kitId;

  const handleGenerate = async () => {
    if (!kitId) return;
    const url = await generateShareLink(kitId, clientName || undefined);
    if (url) setLink(url);
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setLink(null);
          setTab('generate');
        }
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="gap-2"
                  aria-label="Compartilhar kit"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden md:inline">Compartilhar</span>
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {disabled ? 'Salve o kit antes de compartilhar' : 'Gerar link público do kit'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Compartilhar apresentação</DialogTitle>
          <DialogDescription>
            Gere um link público de "{displayKitName(kitName)}" para enviar ao cliente. O link expira em 30 dias e
            esconde preços de custo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'generate' | 'links')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Gerar novo</TabsTrigger>
            <TabsTrigger value="links">
              Links {tokens.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{tokens.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-3 pt-3">
            {!link ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="client-name" className="text-xs">Nome do cliente (opcional)</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex.: Acme S.A."
                    className="h-9"
                  />
                </div>
                <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                  Gerar link de apresentação
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <Label className="text-xs">Link público</Label>
                <div className="flex gap-2">
                  <Input value={link} readOnly className="h-9 font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => handleCopy(link)} aria-label="Copiar link">
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" asChild aria-label="Abrir link">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Expira em 30 dias. Veja a aba "Links" para gerenciar.
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setLink(null); setClientName(''); setTab('links'); }} className="w-full">
                  Ver todos os links
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="space-y-2 pt-3 max-h-[420px] overflow-y-auto">
            {loadingTokens ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum link gerado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {tokens.map((t) => (
                  <TokenRow key={t.id} token={t} kitId={kitId} onCopy={handleCopy} onRevoke={revokeShareLink} />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface TokenRowProps {
  token: KitShareToken;
  kitId: string | undefined;
  onCopy: (url: string) => void;
  onRevoke: (id: string, kitId?: string) => Promise<boolean>;
}

function TokenRow({ token, kitId, onCopy, onRevoke }: TokenRowProps) {
  const url = `${window.location.origin}/kit/${token.token}`;
  const expired = token.expires_at && new Date(token.expires_at) < new Date();
  const status = token.status === 'revoked' ? 'revoked' : expired ? 'expired' : 'active';
  const statusLabel = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado' }[status];
  const statusVariant = { active: 'default', revoked: 'destructive', expired: 'outline' }[status] as 'default' | 'destructive' | 'outline';

  return (
    <li className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
            {token.viewed_at && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Eye className="h-3 w-3" /> Visualizado
              </Badge>
            )}
            {token.client_name && (
              <span className="text-xs text-muted-foreground truncate">{token.client_name}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Criado em {new Date(token.created_at).toLocaleDateString('pt-BR')}
            {token.expires_at && ` • Expira ${new Date(token.expires_at).toLocaleDateString('pt-BR')}`}
            {token.viewed_at && ` • Visto ${new Date(token.viewed_at).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onCopy(url)}
            aria-label="Copiar link"
            disabled={status !== 'active'}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            asChild
            aria-label="Abrir link"
            disabled={status !== 'active'}
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          {status === 'active' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onRevoke(token.id, kitId)}
              aria-label="Revogar link"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
