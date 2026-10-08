import { useState } from 'react';
import { Globe, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAllowedIPs } from '@/hooks/useAllowedIPs';

interface IPRestrictionManagerProps {
  targetUserId?: string;
  readOnly?: boolean;
}

function RestrictionStatusBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <Badge variant="secondary" className="bg-warning/10 text-warning">
      Ativo
    </Badge>
  );
}

type AllowedIpState = ReturnType<typeof useAllowedIPs>;
type AllowedIp = AllowedIpState['allowedIPs'][number];

export function IPRestrictionManager({
  targetUserId,
  readOnly = false,
}: IPRestrictionManagerProps) {
  const data = useAllowedIPs(targetUserId);
  const form = useIpForm(data.currentIP, data.addIP);
  const actions = useIpActions(data.removeIP, data.toggleIP);
  if (data.isLoading) return <IpLoadingCard />;
  return <IpRestrictionCard data={data} form={form} actions={actions} readOnly={readOnly} />;
}

function isValidIpv4(value: string) {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    value,
  );
}

function useIpForm(currentIP: string | null, addIP: AllowedIpState['addIP']) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reset = () => {
    setIsDialogOpen(false);
    setNewIP('');
    setNewLabel('');
  };
  const addCurrentIp = () => {
    if (!currentIP) return;
    setNewIP(currentIP);
    setNewLabel('Meu IP atual');
  };
  const submit = async () => {
    const normalizedIp = newIP.trim();
    if (!normalizedIp || !isValidIpv4(normalizedIp)) {
      toast({
        title: 'IP Inválido',
        description: 'Por favor, digite um endereço IP válido.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    const result = await addIP(normalizedIp, newLabel.trim());
    setIsSubmitting(false);
    showAddIpResult(result, toast, reset);
  };
  return {
    isDialogOpen,
    setIsDialogOpen,
    newIP,
    setNewIP,
    newLabel,
    setNewLabel,
    isSubmitting,
    addCurrentIp,
    submit,
  };
}

function showAddIpResult(
  result: Awaited<ReturnType<AllowedIpState['addIP']>>,
  toast: ReturnType<typeof useToast>['toast'],
  reset: () => void,
) {
  if (result.success) {
    toast({ title: 'IP Adicionado', description: 'O endereço IP foi adicionado à lista de permitidos.' });
    reset();
    return;
  }
  toast({ title: 'Erro', description: result.error || 'Não foi possível adicionar o IP.', variant: 'destructive' });
}

function useIpActions(removeIP: AllowedIpState['removeIP'], toggleIP: AllowedIpState['toggleIP']) {
  const { toast } = useToast();
  const remove = async (ipId: string) => {
    const result = await removeIP(ipId);
    toast(
      result.success
        ? { title: 'IP Removido', description: 'O endereço IP foi removido da lista.' }
        : {
            title: 'Erro',
            description: result.error || 'Não foi possível remover o IP.',
            variant: 'destructive',
          },
    );
  };
  const toggle = async (ipId: string, currentStatus: boolean) => {
    const result = await toggleIP(ipId, !currentStatus);
    if (!result.success) {
      toast({
        title: 'Erro',
        description: result.error || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };
  return { remove, toggle };
}

function IpLoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

interface IpRestrictionCardProps {
  data: AllowedIpState;
  form: ReturnType<typeof useIpForm>;
  actions: ReturnType<typeof useIpActions>;
  readOnly: boolean;
}

function IpRestrictionCard({ data, form, actions, readOnly }: IpRestrictionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Restrição por IP</CardTitle>
          </div>
          <RestrictionStatusBadge active={data.hasIPRestriction} />
        </div>
        <CardDescription>
          Limite o acesso à sua conta apenas de endereços IP específicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CurrentIp ip={data.currentIP} />
        {data.hasIPRestriction && <RestrictionActiveAlert />}
        <AllowedIpsTable ips={data.allowedIPs} readOnly={readOnly} actions={actions} />
        {!readOnly && <AddIpDialog currentIP={data.currentIP} form={form} />}
      </CardContent>
    </Card>
  );
}

function CurrentIp({ ip }: { ip: string | null }) {
  if (!ip) return null;
  return (
    <div className="text-sm text-muted-foreground">
      Seu IP atual: <span className="font-mono font-medium">{ip}</span>
    </div>
  );
}

function RestrictionActiveAlert() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        A restrição por IP está ativa. Apenas os IPs listados abaixo podem acessar esta conta.
      </AlertDescription>
    </Alert>
  );
}

function AllowedIpsTable({
  ips,
  readOnly,
  actions,
}: {
  ips: AllowedIp[];
  readOnly: boolean;
  actions: ReturnType<typeof useIpActions>;
}) {
  if (ips.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Nenhum IP configurado. O acesso está liberado de qualquer endereço.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Endereço IP</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          {!readOnly && <TableHead className="w-[100px]">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {ips.map((ip) => (
          <AllowedIpRow key={ip.id} ip={ip} readOnly={readOnly} actions={actions} />
        ))}
      </TableBody>
    </Table>
  );
}

function AllowedIpRow({
  ip,
  readOnly,
  actions,
}: {
  ip: AllowedIp;
  readOnly: boolean;
  actions: ReturnType<typeof useIpActions>;
}) {
  return (
    <TableRow>
      <TableCell className="font-mono">{ip.ip_address}</TableCell>
      <TableCell>{ip.label || '-'}</TableCell>
      <TableCell>
        <Badge variant={ip.is_active ? 'default' : 'secondary'}>
          {ip.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </TableCell>
      {!readOnly && (
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Alternar IP"
              onClick={() => void actions.toggle(ip.id, ip.is_active)}
            >
              {ip.is_active ? (
                <ToggleRight className="h-4 w-4 text-success" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir IP"
              onClick={() => void actions.remove(ip.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

function AddIpDialog({
  currentIP,
  form,
}: {
  currentIP: string | null;
  form: ReturnType<typeof useIpForm>;
}) {
  return (
    <Dialog open={form.isDialogOpen} onOpenChange={form.setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar IP
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar IP Permitido</DialogTitle>
          <DialogDescription>
            Adicione um endereço IP que terá permissão para acessar a conta.
          </DialogDescription>
        </DialogHeader>
        <AddIpFields currentIP={currentIP} form={form} />
      </DialogContent>
    </Dialog>
  );
}

function AddIpFields({ currentIP, form }: { currentIP: string | null; form: ReturnType<typeof useIpForm> }) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2"><Label>Endereço IP</Label><div className="flex gap-2">
        <Input placeholder="192.168.1.1" value={form.newIP} onChange={(event) => form.setNewIP(event.target.value)} />
        <Button variant="outline" onClick={form.addCurrentIp} disabled={!currentIP}>Usar Meu IP</Button>
      </div></div>
      <div className="space-y-2"><Label>Descrição (opcional)</Label>
        <Input placeholder="Ex: Escritório, Casa, etc." value={form.newLabel} onChange={(event) => form.setNewLabel(event.target.value)} />
      </div>
      <Button onClick={() => void form.submit()} disabled={!form.newIP.trim() || form.isSubmitting} className="w-full">
        {form.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar IP
      </Button>
    </div>
  );
}
