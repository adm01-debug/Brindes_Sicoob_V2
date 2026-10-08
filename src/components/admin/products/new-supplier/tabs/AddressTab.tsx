import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Truck, X } from 'lucide-react';
import { maskCep, ESTADOS_BR } from '@/utils/masks';
import type { NewSupplierFormState } from '../useNewSupplierForm';

const fieldClass = "mt-1.5 h-9";

interface AddressTabProps {
  form: NewSupplierFormState;
}

function CoreAddressFields({ form }: AddressTabProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">CEP</Label><Input value={form.cep} onChange={(event: ChangeEvent<HTMLInputElement>) => void form.handleCepLookup(maskCep(event.target.value))} placeholder="00000-000" className={`${fieldClass} font-mono`} maxLength={9} /></div>
        <div><Label className="text-xs font-semibold">Tipo Logradouro</Label><select value={form.tipoLogradouro} onChange={(event) => form.setTipoLogradouro(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo', 'Outro'].map(type => <option key={type} value={type}>{type}</option>)}</select></div>
      </div>
      <div><Label className="text-xs font-semibold">Logradouro</Label><Input value={form.logradouro} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setLogradouro(event.target.value)} placeholder="Nome da rua" className={fieldClass} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Número</Label><Input value={form.numero} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setNumero(event.target.value)} placeholder="123" className={fieldClass} /></div>
        <div><Label className="text-xs font-semibold">Complemento</Label><Input value={form.complemento} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setComplemento(event.target.value)} placeholder="Sala 101" className={fieldClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Bairro</Label><Input value={form.bairro} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setBairro(event.target.value)} placeholder="Centro" className={fieldClass} /></div>
        <div><Label className="text-xs font-semibold">Cidade</Label><Input value={form.cidade} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setCidade(event.target.value)} placeholder="São Paulo" className={fieldClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Estado</Label><select value={form.estado} onChange={(event) => form.setEstado(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{ESTADOS_BR.map(state => <option key={state} value={state}>{state}</option>)}</select></div>
        <div><Label className="text-xs font-semibold">País</Label><Input value={form.pais} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setPais(event.target.value)} className={fieldClass} /></div>
      </div>
      <div><Label className="text-xs font-semibold">Ponto de Referência</Label><Input value={form.pontoReferencia} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setPontoReferencia(event.target.value)} placeholder="Próximo ao..." className={fieldClass} /></div>
    </>
  );
}

function LocationMetadataFields({ form }: AddressTabProps) {
  return <>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setLatitude(event.target.value)} placeholder="-23.5505" className={`${fieldClass} font-mono`} /></div>
        <div><Label className="text-xs font-semibold">Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setLongitude(event.target.value)} placeholder="-46.6333" className={`${fieldClass} font-mono`} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Google Maps URL</Label><Input value={form.googleMapsUrl} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setGoogleMapsUrl(event.target.value)} placeholder="https://maps.google.com/..." className={fieldClass} /></div>
        <div><Label className="text-xs font-semibold">Google Place ID</Label><Input value={form.googlePlaceId} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setGooglePlaceId(event.target.value)} placeholder="ChIJ..." className={fieldClass} /></div>
      </div>
      <div><Label className="text-xs font-semibold">Horário de Funcionamento</Label><Input value={form.horarioFuncionamento} onChange={(event: ChangeEvent<HTMLInputElement>) => form.setHorarioFuncionamento(event.target.value)} placeholder="Seg-Sex 08:00-18:00" className={fieldClass} /></div>
    </>;
}

function CarrierField({ form }: AddressTabProps) {
  const clearCarrier = () => { form.setTransportadoraPadrao(''); form.setTransportadoraId(''); form.setCarrierSearch(''); };
  return (
      <div className="relative">
        <Label className="text-xs font-semibold flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Transportadora Padrão</Label>
        {form.transportadoraPadrao ? (
          <div className="flex items-center gap-2 mt-1">
            <div className={`${fieldClass} flex-1 flex items-center px-3 text-sm`}>{form.transportadoraPadrao}</div>
            <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="h-9 w-9 shrink-0" onClick={clearCarrier}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={form.carrierSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => { const val = e.target.value; form.setCarrierSearch(val); clearTimeout(form.carrierSearchTimeout.current); form.carrierSearchTimeout.current = setTimeout(() => form.searchCarriers(val), 400); }} onFocus={() => { if (form.carrierResults.length > 0) form.setShowCarrierDropdown(true); }} onBlur={() => setTimeout(() => form.setShowCarrierDropdown(false), 200)} placeholder="Buscar transportadora..." className={`${fieldClass} pl-9`} />
            {form.searchingCarriers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {form.showCarrierDropdown && form.carrierResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {form.carrierResults.map((carrier) => (
                  <button key={carrier.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors" onMouseDown={(event) => { event.preventDefault(); form.setTransportadoraPadrao(carrier.nome_fantasia || carrier.razao_social); form.setTransportadoraId(carrier.id); form.setCarrierSearch(''); form.setShowCarrierDropdown(false); }}>
                    <span className="font-medium">{carrier.nome_fantasia || carrier.razao_social}</span>
                    {carrier.nome_fantasia && carrier.razao_social && <span className="text-xs text-muted-foreground ml-2">({carrier.razao_social})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
}

export function AddressTab({ form }: AddressTabProps) {
  return (
    <div className="space-y-3 pt-3">
      <CoreAddressFields form={form} />
      <LocationMetadataFields form={form} />
      <CarrierField form={form} />
      <div><Label className="text-xs font-semibold">Instruções de Entrega</Label><Textarea value={form.instrucoesEntrega} onChange={(e) => form.setInstrucoesEntrega(e.target.value)} placeholder="Entrar pela portaria lateral..." className="mt-1.5 min-h-[60px]" /></div>
    </div>
  );
}
