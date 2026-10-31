import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Phone, DollarSign, Settings2, MapPin, Globe, UserPlus, Landmark, Loader2, Plus, Trash2, ImagePlus, X, Search, Truck } from 'lucide-react';
import { maskCnpj, maskPhone, ESTADOS_BR } from '@/utils/masks';
import { applyPixMask, pixPlaceholder, validatePixKey } from '@/utils/pixMask';
import { type Supplier, type SupplierContact, type PixKey, CONTACT_ROLES } from "./types";
import React from 'react';

interface SupplierFormDialogProps {
  editingSupplier: Partial<Supplier> | null;
  setEditingSupplier: (s: Partial<Supplier> | null) => void;
  isNew: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  fetchingCnpj: boolean;
  contacts: SupplierContact[];
  formaPagamento: string[];
  setFormaPagamento: React.Dispatch<React.SetStateAction<string[]>>;
  pixKeys: PixKey[];
  foneFixo1: string;
  setFoneFixo1: (v: string) => void;
  foneFixo2: string;
  setFoneFixo2: (v: string) => void;
  inscricaoEstadual: string;
  setInscricaoEstadual: (v: string) => void;
  regimeTributario: string;
  setRegimeTributario: (v: string) => void;
  estadoFaturamento: string;
  setEstadoFaturamento: (v: string) => void;
  transportadoraPadrao: string;
  setTransportadoraPadrao: (v: string) => void;
  transportadoraId: string;
  setTransportadoraId: (v: string) => void;
  carrierSearch: string;
  setCarrierSearch: (v: string) => void;
  carrierResults: Array<{ id: string; nome_fantasia: string; razao_social: string }>;
  searchingCarriers: boolean;
  showCarrierDropdown: boolean;
  setShowCarrierDropdown: (v: boolean) => void;
  searchCarriers: (term: string) => void;
  carrierSearchTimeout: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  updateField: (field: string, value: unknown) => void;
  handleSave: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCnpjLookup: () => void;
  handleCepLookup: (cep: string) => void;
  updateContact: (id: string, field: keyof SupplierContact, value: string) => void;
  addContact: () => void;
  removeContact: (id: string) => void;
  updatePixKey: (id: string, field: keyof Omit<PixKey, 'id'>, value: string | boolean) => void;
  addPixKey: () => void;
  removePixKey: (id: string) => void;
}

function fieldText(value: string | null | undefined, fallback = ''): string {
  return value || fallback;
}

function fieldNumber(value: number | null | undefined, fallback: number | ''): number | '' {
  return value ?? fallback;
}

function parseOptionalFloat(value: string): number | null {
  return value ? parseFloat(value) : null;
}

function parseOptionalInt(value: string, fallback: number | null = null): number | null {
  return value ? parseInt(value) : fallback;
}

function cnpjLookupDisabled(fetching: boolean, cnpj: string | null | undefined): boolean {
  return fetching || fieldText(cnpj).replace(/\D/g, '').length !== 14;
}

function carrierName(carrier: { nome_fantasia: string; razao_social: string }): string {
  return carrier.nome_fantasia || carrier.razao_social;
}

function saveButtonLabel(isNew: boolean): string {
  return isNew ? 'Criar Fornecedor' : 'Salvar Alterações';
}

function dialogTitle(isNew: boolean, supplierName: string | undefined): string {
  return isNew ? 'Novo Fornecedor' : `Editar: ${supplierName}`;
}

function loadingIcon(loading: boolean, idleIcon: React.ReactNode): React.ReactNode {
  return loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : idleIcon;
}

function booleanDefault(value: boolean | null | undefined, fallback: boolean): boolean {
  return value ?? fallback;
}

export function SupplierFormDialog({
  editingSupplier, setEditingSupplier, isNew, saving, uploadingLogo, fetchingCnpj,
  contacts, formaPagamento, setFormaPagamento, pixKeys,
  foneFixo1, setFoneFixo1, foneFixo2, setFoneFixo2,
  inscricaoEstadual, setInscricaoEstadual, regimeTributario, setRegimeTributario,
  estadoFaturamento, setEstadoFaturamento,
  transportadoraPadrao, setTransportadoraPadrao, setTransportadoraId,
  carrierSearch, setCarrierSearch, carrierResults, searchingCarriers, showCarrierDropdown, setShowCarrierDropdown,
  searchCarriers, carrierSearchTimeout,
  logoInputRef,
  updateField, handleSave, handleLogoUpload, handleCnpjLookup, handleCepLookup,
  updateContact, addContact, removeContact, updatePixKey, addPixKey, removePixKey,
}: SupplierFormDialogProps) {
  const fieldClass = "mt-1.5 h-9";

  if (!editingSupplier) return null;

  return (
    <Dialog open={!!editingSupplier} onOpenChange={(open) => { if (!open) setEditingSupplier(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {(<DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {dialogTitle(isNew, editingSupplier.name)}
          </DialogTitle>
        </DialogHeader>)}

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-7 h-9">
            <TabsTrigger value="basic" className="text-xs gap-1.5"><Building2 className="h-3.5 w-3.5" />Dados</TabsTrigger>
            <TabsTrigger value="contact" className="text-xs gap-1.5"><Phone className="h-3.5 w-3.5" />Contatos</TabsTrigger>
            <TabsTrigger value="address" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Endereço</TabsTrigger>
            <TabsTrigger value="social" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" />Site/Redes</TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" />Comercial</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs gap-1.5"><Landmark className="h-3.5 w-3.5" />Financeiro</TabsTrigger>
            <TabsTrigger value="classification" className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" />Tipo</TabsTrigger>
          </TabsList>

          {/* BASIC */}
          <TabsContent value="basic" className="space-y-4 pt-3">
            {/* LOGO + NOME FANTASIA + CÓDIGO */}
            {(<div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {editingSupplier.logo_url ? (
                  <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted">
                    
<img src={editingSupplier.logo_url} alt="Logo" className="w-full h-full object-contain"  loading="lazy" />
                    <button type="button" onClick={() => updateField('logo_url', null)} className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="h-5 w-5" /><span className="text-[10px]">Logo</span></>}
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              <div className="flex-1">
                <Label className="text-xs font-semibold">Nome Fantasia</Label>
                <Input value={fieldText(editingSupplier.trading_name)} onChange={e => updateField('trading_name', e.target.value)} className={fieldClass} />
              </div>
              <div className="w-40 shrink-0">
                <Label className="text-xs font-semibold">Código <span className="text-destructive">*</span></Label>
                <Input value={fieldText(editingSupplier.code)} onChange={e => updateField('code', e.target.value)} className={`${fieldClass} font-mono uppercase`} />
              </div>
            </div>)}
            {(<div><Label className="text-xs font-semibold">Razão Social <span className="text-destructive">*</span></Label><Input value={fieldText(editingSupplier.name)} onChange={e => updateField('name', e.target.value)} className={fieldClass} /></div>)}
            {/* CNPJ + INSCRIÇÃO ESTADUAL */}
            {(<div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">CNPJ</Label>
                <div className="flex gap-1.5">
                  <Input value={fieldText(editingSupplier.cnpj)} onChange={e => updateField('cnpj', maskCnpj(e.target.value))} className={`${fieldClass} font-mono flex-1`} maxLength={18} />
                  <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 shrink-0" disabled={cnpjLookupDisabled(fetchingCnpj, editingSupplier.cnpj)} onClick={handleCnpjLookup}>
                    {loadingIcon(fetchingCnpj, <Search className="h-3.5 w-3.5" />)}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Inscrição Estadual</Label>
                <Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} placeholder="Ex: 123.456.789.000" className={fieldClass} />
              </div>
            </div>)}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Fone Fixo 01</Label><Input value={foneFixo1} onChange={e => setFoneFixo1(maskPhone(e.target.value))} placeholder="(00) 0000-0000" className={fieldClass} maxLength={15} /></div>
              <div><Label className="text-xs font-semibold">Fone Fixo 02</Label><Input value={foneFixo2} onChange={e => setFoneFixo2(maskPhone(e.target.value))} placeholder="(00) 0000-0000" className={fieldClass} maxLength={15} /></div>
            </div>
            {/* REGIME TRIBUTÁRIO + ESTADO DE FATURAMENTO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Regime Tributário</Label>
                <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Selecione o regime" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEI">MEI</SelectItem>
                    <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                    <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                    <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Estado de Faturamento</Label>
                <Select value={estadoFaturamento} onValueChange={setEstadoFaturamento}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(<div className="flex items-center justify-between rounded-lg border border-border p-3"><Label className="text-sm">Ativo</Label><Switch checked={editingSupplier.active !== false} onCheckedChange={v => updateField('active', v)} /></div>)}
          </TabsContent>

          {/* CONTACTS */}
          <TabsContent value="contact" className="space-y-3 pt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Adicione os contatos do fornecedor</p>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addContact}><UserPlus className="h-3.5 w-3.5" />Adicionar Contato</Button>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {contacts.map((contact, index) => (
                <div key={contact.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Contato {index + 1}</span>
                    {contacts.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeContact(contact.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold">Função / Cargo</Label>
                      <Select value={contact.role} onValueChange={(v) => updateContact(contact.id, 'role', v)}><SelectTrigger className={`${fieldClass} w-full`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CONTACT_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div><Label className="text-xs font-semibold">Nome</Label><Input value={contact.name} onChange={(e) => updateContact(contact.id, 'name', e.target.value)} placeholder="Ex.: João" className={fieldClass} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold">Assinatura</Label><Input value={contact.signature} onChange={(e) => updateContact(contact.id, 'signature', e.target.value)} className={fieldClass} /></div>
                    <div><Label className="text-xs font-semibold">Apelido</Label><Input value={contact.nickname} onChange={(e) => updateContact(contact.id, 'nickname', e.target.value)} className={fieldClass} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold">Telefone</Label><Input value={contact.phone} onChange={(e) => updateContact(contact.id, 'phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" className={fieldClass} maxLength={15} /></div>
                    <div><Label className="text-xs font-semibold">E-mail</Label><Input type="email" value={contact.email} onChange={(e) => updateContact(contact.id, 'email', e.target.value)} className={fieldClass} /></div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ADDRESS */}
          <TabsContent value="address" className="space-y-3 pt-3">
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">CEP</Label><Input value={fieldText(editingSupplier.cep)} onChange={e => handleCepLookup(e.target.value)} placeholder="00000-000" className={`${fieldClass} font-mono`} maxLength={9} /></div>
              <div><Label className="text-xs font-semibold">Tipo Logradouro</Label>
                <select value={fieldText(editingSupplier.tipo_logradouro)} onChange={e => updateField('tipo_logradouro', e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>{['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo', 'Outro'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>)}
            {(<div><Label className="text-xs font-semibold">Logradouro</Label><Input value={fieldText(editingSupplier.logradouro)} onChange={e => updateField('logradouro', e.target.value)} className={fieldClass} /></div>)}
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Número</Label><Input value={fieldText(editingSupplier.numero)} onChange={e => updateField('numero', e.target.value)} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Complemento</Label><Input value={fieldText(editingSupplier.complemento)} onChange={e => updateField('complemento', e.target.value)} className={fieldClass} /></div>
            </div>)}
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Bairro</Label><Input value={fieldText(editingSupplier.bairro)} onChange={e => updateField('bairro', e.target.value)} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Cidade</Label><Input value={fieldText(editingSupplier.cidade)} onChange={e => updateField('cidade', e.target.value)} className={fieldClass} /></div>
            </div>)}
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Estado</Label>
                <select value={fieldText(editingSupplier.estado)} onChange={e => updateField('estado', e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}</select>
              </div>
              <div><Label className="text-xs font-semibold">País</Label><Input value={fieldText(editingSupplier.pais, 'Brasil')} onChange={e => updateField('pais', e.target.value)} className={fieldClass} /></div>
            </div>)}
            {(<div><Label className="text-xs font-semibold">Ponto de Referência</Label><Input value={fieldText(editingSupplier.ponto_referencia)} onChange={e => updateField('ponto_referencia', e.target.value)} className={fieldClass} /></div>)}
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Latitude</Label><Input type="number" step="any" value={fieldNumber(editingSupplier.latitude, '')} onChange={e => updateField('latitude', parseOptionalFloat(e.target.value))} className={`${fieldClass} font-mono`} /></div>
              <div><Label className="text-xs font-semibold">Longitude</Label><Input type="number" step="any" value={fieldNumber(editingSupplier.longitude, '')} onChange={e => updateField('longitude', parseOptionalFloat(e.target.value))} className={`${fieldClass} font-mono`} /></div>
            </div>)}
            {(<div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Google Maps URL</Label><Input value={fieldText(editingSupplier.google_maps_url)} onChange={e => updateField('google_maps_url', e.target.value)} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Google Place ID</Label><Input value={fieldText(editingSupplier.google_place_id)} onChange={e => updateField('google_place_id', e.target.value)} className={fieldClass} /></div>
            </div>)}
            {(<div><Label className="text-xs font-semibold">Horário de Funcionamento</Label><Input value={fieldText(editingSupplier.horario_funcionamento)} onChange={e => updateField('horario_funcionamento', e.target.value)} className={fieldClass} /></div>)}
            {/* TRANSPORTADORA PADRÃO */}
            {(<div className="relative">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Transportadora Padrão
              </Label>
              {transportadoraPadrao ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`${fieldClass} flex-1 flex items-center px-3 text-sm`}>
                    {transportadoraPadrao}
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="h-9 w-9 shrink-0" onClick={() => {
                    setTransportadoraPadrao(''); setTransportadoraId(''); setCarrierSearch('');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={carrierSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCarrierSearch(val);
                      clearTimeout(carrierSearchTimeout.current);
                      carrierSearchTimeout.current = setTimeout(() => searchCarriers(val), 400);
                    }}
                    onFocus={() => { if (carrierResults.length > 0) setShowCarrierDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowCarrierDropdown(false), 200)}
                    placeholder="Buscar transportadora..."
                    className={`${fieldClass} pl-9`}
                  />
                  {searchingCarriers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  {showCarrierDropdown && carrierResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
                      {carrierResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const displayName = carrierName(c);
                            setTransportadoraPadrao(displayName);
                            setTransportadoraId(c.id);
                            setCarrierSearch('');
                            setShowCarrierDropdown(false);
                          }}
                        >
                          <span className="font-medium">{carrierName(c)}</span>
                          {c.nome_fantasia && c.razao_social && (
                            <span className="text-xs text-muted-foreground ml-2">({c.razao_social})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>)}
            {(<div><Label className="text-xs font-semibold">Instruções de Entrega</Label><Textarea value={fieldText(editingSupplier.instrucoes_entrega)} onChange={e => updateField('instrucoes_entrega', e.target.value)} className="mt-1.5 min-h-[60px]" /></div>)}
          </TabsContent>

          {/* SOCIAL */}
          {(<TabsContent value="social" className="space-y-4 pt-3">
            <div><Label className="text-xs font-semibold">Website</Label><Input value={fieldText(editingSupplier.website)} onChange={e => updateField('website', e.target.value)} className={fieldClass} /></div>
            <div><Label className="text-xs font-semibold">Instagram</Label><Input value={fieldText(editingSupplier.instagram)} onChange={e => updateField('instagram', e.target.value)} className={fieldClass} /></div>
            <div><Label className="text-xs font-semibold">Facebook</Label><Input value={fieldText(editingSupplier.facebook)} onChange={e => updateField('facebook', e.target.value)} className={fieldClass} /></div>
            <div><Label className="text-xs font-semibold">LinkedIn</Label><Input value={fieldText(editingSupplier.linkedin)} onChange={e => updateField('linkedin', e.target.value)} className={fieldClass} /></div>
            <div><Label className="text-xs font-semibold">YouTube</Label><Input value={fieldText(editingSupplier.youtube)} onChange={e => updateField('youtube', e.target.value)} className={fieldClass} /></div>
            <div><Label className="text-xs font-semibold">TikTok</Label><Input value={fieldText(editingSupplier.tiktok)} onChange={e => updateField('tiktok', e.target.value)} className={fieldClass} /></div>
          </TabsContent>)}

          {/* COMMERCIAL */}
          {(<TabsContent value="commercial" className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-xs font-semibold">Markup (%)</Label><Input type="number" value={fieldNumber(editingSupplier.default_markup_percent, '')} onChange={e => updateField('default_markup_percent', parseOptionalFloat(e.target.value))} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Pedido Mínimo (R$)</Label><Input type="number" value={fieldNumber(editingSupplier.min_order_value, '')} onChange={e => updateField('min_order_value', parseOptionalFloat(e.target.value))} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Prazo (dias)</Label><Input type="number" value={fieldNumber(editingSupplier.delivery_time_days, '')} onChange={e => updateField('delivery_time_days', parseOptionalInt(e.target.value))} className={fieldClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold">Cond. Pagamento</Label><Input value={fieldText(editingSupplier.payment_terms)} onChange={e => updateField('payment_terms', e.target.value)} className={fieldClass} /></div>
              <div><Label className="text-xs font-semibold">Cond. Frete</Label><Input value={fieldText(editingSupplier.shipping_terms)} onChange={e => updateField('shipping_terms', e.target.value)} className={fieldClass} /></div>
            </div>
            <div><Label className="text-xs font-semibold">Prioridade (0-100)</Label><Input type="number" value={fieldNumber(editingSupplier.priority, 50)} onChange={e => updateField('priority', parseOptionalInt(e.target.value, 50))} className={`${fieldClass} w-24`} min={0} max={100} /></div>
            <div><Label className="text-xs font-semibold">Observações</Label><Textarea value={fieldText(editingSupplier.notes)} onChange={e => updateField('notes', e.target.value)} className="mt-1.5 min-h-[80px]" /></div>
          </TabsContent>)}

          {/* FINANCIAL */}
          {(<TabsContent value="financial" className="space-y-4 pt-3">
            <div>
              <Label className="text-xs font-semibold">Formas de Pagamento</Label>
              <div className="flex gap-3 mt-1.5">
                {['Boleto', 'PIX', 'Transferência', 'Cartão'].map(method => (
                  <label key={method} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={formaPagamento.includes(method)} onChange={(e) => { if (e.target.checked) setFormaPagamento(prev => [...prev, method]); else setFormaPagamento(prev => prev.filter(m => m !== method)); }} className="rounded border-border" />{method}
                  </label>
                ))}
              </div>
            </div>
            {formaPagamento.includes('PIX') && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chaves PIX</p>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addPixKey}><Plus className="h-3.5 w-3.5" />Adicionar Chave</Button>
                </div>
                {pixKeys.map((pix, idx) => (
                  <div key={pix.id} className="rounded-lg border border-border bg-background/50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name="pix-principal-edit" checked={pix.principal} onChange={() => updatePixKey(pix.id, 'principal', true)} className="accent-primary" />
                        <span className={pix.principal ? 'font-semibold text-primary' : 'text-muted-foreground'}>{pix.principal ? '★ Principal' : `Chave ${idx + 1}`}</span>
                      </label>
                      {pixKeys.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removePixKey(pix.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs font-semibold">Tipo de Chave</Label>
                        <Select value={pix.tipo} onValueChange={v => updatePixKey(pix.id, 'tipo', v)}><SelectTrigger className={`${fieldClass} w-full`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="CNPJ">CNPJ</SelectItem><SelectItem value="CPF">CPF</SelectItem><SelectItem value="Email">E-mail</SelectItem><SelectItem value="Telefone">Telefone</SelectItem><SelectItem value="Aleatória">Chave Aleatória</SelectItem></SelectContent></Select>
                      </div>
                      <div><Label className="text-xs font-semibold">Chave PIX</Label><Input value={pix.chave} onChange={e => updatePixKey(pix.id, 'chave', applyPixMask(e.target.value, pix.tipo))} placeholder={pixPlaceholder(pix.tipo)} className={`${fieldClass} ${validatePixKey(pix.chave, pix.tipo) ? 'border-destructive' : ''}`} />
                        {validatePixKey(pix.chave, pix.tipo) && <p className="text-xs text-destructive mt-1">{validatePixKey(pix.chave, pix.tipo)}</p>}
                      </div>
                    </div>
                    <div><Label className="text-xs font-semibold">Favorecido (Nome)</Label><Input value={pix.favorecido} onChange={e => updatePixKey(pix.id, 'favorecido', e.target.value)} className={fieldClass} /></div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>)}

          {/* CLASSIFICATION */}
          {(<TabsContent value="classification" className="space-y-6 pt-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div><p className="text-sm font-medium">Fornecedor de Produtos</p><p className="text-xs text-muted-foreground">Fornece produtos físicos para revenda</p></div>
              <Switch checked={booleanDefault(editingSupplier.is_product_supplier, true)} onCheckedChange={v => updateField('is_product_supplier', v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div><p className="text-sm font-medium">Fornecedor de Gravação</p><p className="text-xs text-muted-foreground">Fornece serviços de personalização/gravação</p></div>
              <Switch checked={booleanDefault(editingSupplier.is_engraving_supplier, false)} onCheckedChange={v => updateField('is_engraving_supplier', v)} />
            </div>
          </TabsContent>)}
        </Tabs>

        {(<div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="ghost" size="sm" onClick={() => setEditingSupplier(null)}>Cancelar</Button>
          <Button size="sm" disabled={saving} onClick={handleSave} className="gap-1.5">
            {loadingIcon(saving, <Plus className="h-3.5 w-3.5" />)}
            {saveButtonLabel(isNew)}
          </Button>
        </div>)}
      </DialogContent>
    </Dialog>
  );
}
