import { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  MapPin,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useGeoBlocking } from '@/hooks/useGeoBlocking';

// Lista de países comuns
const COMMON_COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'PY', name: 'Paraguai' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'JP', name: 'Japão' },
  { code: 'CN', name: 'China' },
];

function GeoStatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge variant="secondary" className="bg-warning/10 text-warning">
      Ativo
    </Badge>
  ) : null;
}

function CurrentLocation({ location }: { location?: { name: string; code: string } | null }) {
  if (!location) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4" />
      Sua localização atual:{' '}
      <span className="font-medium">
        {location.name} ({location.code})
      </span>
    </div>
  );
}

function GeoBlockingAlert({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <Alert>
      <Shield className="h-4 w-4" />
      <AlertDescription>
        O bloqueio geográfico está ativo. Apenas usuários dos países listados abaixo podem acessar o
        sistema.
      </AlertDescription>
    </Alert>
  );
}

function DisabledGeoAlert({ enabled, countryCount }: { enabled: boolean; countryCount: number }) {
  if (enabled || countryCount === 0) return null;
  return (
    <Alert variant="default">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        O bloqueio geográfico está desativado. Ative-o para restringir o acesso aos países listados.
      </AlertDescription>
    </Alert>
  );
}

type GeoState = ReturnType<typeof useGeoBlocking>;
type AllowedCountry = GeoState['countries'][number];
type CountryOption = (typeof COMMON_COUNTRIES)[number];

interface CountryForm {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  selectedCountry: string;
  customCode: string;
  customName: string;
  isSubmitting: boolean;
  availableCountries: CountryOption[];
  selectCountry: (code: string) => void;
  setCode: (code: string) => void;
  setName: (name: string) => void;
  selectCurrentLocation: () => void;
  submit: () => Promise<void>;
}

function resolveCountry(
  selectedCountry: string,
  customCode: string,
  customName: string,
): CountryOption | null {
  if (selectedCountry) {
    return COMMON_COUNTRIES.find(({ code }) => code === selectedCountry) ?? null;
  }
  if (!customCode || !customName) return null;
  return { code: customCode.toUpperCase(), name: customName };
}

function useGeoToggle(toggleEnabled: GeoState['toggleEnabled']) {
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const toggle = async (enabled: boolean) => {
    setIsToggling(true);
    const result = await toggleEnabled(enabled);
    setIsToggling(false);
    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      return;
    }
    toast({
      title: enabled ? 'Bloqueio Geográfico Ativado' : 'Bloqueio Geográfico Desativado',
      description: enabled
        ? 'Apenas países permitidos poderão acessar o sistema.'
        : 'O acesso está liberado de qualquer país.',
    });
  };
  return { isToggling, toggle };
}

function useGeoCountryActions(data: GeoState) {
  const { toast } = useToast();
  const remove = async (country: AllowedCountry) => {
    const result = await data.removeCountry(country.id);
    toast(
      result.success
        ? { title: 'País Removido', description: `${country.city_name} foi removido da lista.` }
        : { title: 'Erro', description: result.error, variant: 'destructive' },
    );
  };
  const toggle = async (country: AllowedCountry) => {
    const result = await data.toggleCountry(country.id, !country.is_active);
    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };
  return { remove, toggle };
}

function useCountryForm(data: GeoState): CountryForm {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reset = () => {
    setSelectedCountry('');
    setCustomCode('');
    setCustomName('');
  };
  const selectCountry = (code: string) => {
    setSelectedCountry(code);
    setCustomCode('');
    setCustomName('');
  };
  const setCode = (code: string) => {
    setCustomCode(code.toUpperCase().slice(0, 2));
    setSelectedCountry('');
  };
  const setName = (name: string) => {
    setCustomName(name);
    setSelectedCountry('');
  };
  return buildCountryForm(data, {
    isDialogOpen,
    setIsDialogOpen,
    selectedCountry,
    customCode,
    customName,
    isSubmitting,
    setIsSubmitting,
    reset,
    selectCountry,
    setCode,
    setName,
    toast,
  });
}

type FormState = Omit<CountryForm, 'availableCountries' | 'selectCurrentLocation' | 'submit'> & {
  setIsSubmitting: (value: boolean) => void;
  reset: () => void;
  toast: ReturnType<typeof useToast>['toast'];
};

function buildCountryForm(data: GeoState, form: FormState): CountryForm {
  const selectCurrentLocation = () => {
    if (!data.currentCountry) return;
    form.setCode(data.currentCountry.code);
    form.setName(data.currentCountry.name);
  };
  const submit = async () => {
    const country = resolveCountry(form.selectedCountry, form.customCode, form.customName);
    if (!country) {
      form.toast({
        title: 'Erro',
        description: 'Selecione um país ou preencha os campos personalizados.',
        variant: 'destructive',
      });
      return;
    }
    form.setIsSubmitting(true);
    const result = await data.addCountry(country.code, country.name);
    form.setIsSubmitting(false);
    showAddCountryResult(result, country.name, form);
  };
  const availableCountries = COMMON_COUNTRIES.filter(
    ({ code }) => !data.countries.some((country) => country.country_code === code),
  );
  return { ...form, availableCountries, selectCurrentLocation, submit };
}

function showAddCountryResult(
  result: Awaited<ReturnType<GeoState['addCountry']>>,
  name: string,
  form: FormState,
) {
  if (!result.success) {
    form.toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    return;
  }
  form.toast({
    title: 'País Adicionado',
    description: `${name} foi adicionado à lista de países permitidos.`,
  });
  form.setIsDialogOpen(false);
  form.reset();
}

function GeoLoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function GeoHeader({ data }: { data: GeoState }) {
  const { isToggling, toggle } = useGeoToggle(data.toggleEnabled);
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Bloqueio Geográfico</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <GeoStatusBadge enabled={data.isEnabled} />
          <Switch checked={data.isEnabled} onCheckedChange={toggle} disabled={isToggling} />
        </div>
      </div>
      <CardDescription>
        Restrinja o acesso ao sistema apenas para países específicos (whitelist global).
      </CardDescription>
    </CardHeader>
  );
}

function CountryRow({ country, data }: { country: AllowedCountry; data: GeoState }) {
  const actions = useGeoCountryActions(data);
  return (
    <TableRow>
      <TableCell className="font-medium">{country.city_name}</TableCell>
      <TableCell>
        <Badge variant="outline">{country.country_code}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={country.is_active ? 'default' : 'secondary'}>
          {country.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar país"
            onClick={() => actions.toggle(country)}
          >
            {country.is_active ? (
              <ToggleRight className="h-4 w-4 text-success" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir país"
            onClick={() => actions.remove(country)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CountriesTable({ data }: { data: GeoState }) {
  if (data.countries.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Nenhum país configurado. Adicione países à lista de permitidos.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>País</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.countries.map((country) => (
          <CountryRow key={country.id} country={country} data={data} />
        ))}
      </TableBody>
    </Table>
  );
}

function CountryFormFields({ form }: { form: CountryForm }) {
  return (
    <>
      <div className="space-y-2">
        <Label>Selecione um País</Label>
        <Select value={form.selectedCountry} onValueChange={form.selectCountry}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um país..." />
          </SelectTrigger>
          <SelectContent>
            {form.availableCountries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name} ({country.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Ou adicione manualmente</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código (ISO 2)</Label>
          <Input
            placeholder="BR"
            value={form.customCode}
            onChange={(event) => form.setCode(event.target.value)}
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Nome do País</Label>
          <Input
            placeholder="Brasil"
            value={form.customName}
            onChange={(event) => form.setName(event.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function CurrentLocationButton({ data, form }: { data: GeoState; form: CountryForm }) {
  const current = data.currentCountry;
  if (!current || data.countries.some((country) => country.country_code === current.code))
    return null;
  return (
    <Button variant="outline" className="w-full" onClick={form.selectCurrentLocation}>
      <MapPin className="mr-2 h-4 w-4" />
      Usar minha localização ({current.name})
    </Button>
  );
}

function AddCountryDialog({ data }: { data: GeoState }) {
  const form = useCountryForm(data);
  const disabled =
    (!form.selectedCountry && (!form.customCode || !form.customName)) || form.isSubmitting;
  return (
    <Dialog open={form.isDialogOpen} onOpenChange={form.setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar País
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar País Permitido</DialogTitle>
          <DialogDescription>
            Adicione um país à lista de países que podem acessar o sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CountryFormFields form={form} />
          <CurrentLocationButton data={data} form={form} />
          <Button onClick={form.submit} disabled={disabled} className="w-full">
            {form.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Adicionar País
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GeoBlockingManager() {
  const data = useGeoBlocking();
  if (data.isLoading) return <GeoLoadingCard />;
  return (
    <Card>
      <GeoHeader data={data} />
      <CardContent className="space-y-4">
        <CurrentLocation location={data.currentCountry} />
        <GeoBlockingAlert enabled={data.isEnabled} />
        <CountriesTable data={data} />
        <AddCountryDialog data={data} />
        <DisabledGeoAlert enabled={data.isEnabled} countryCount={data.countries.length} />
      </CardContent>
    </Card>
  );
}
