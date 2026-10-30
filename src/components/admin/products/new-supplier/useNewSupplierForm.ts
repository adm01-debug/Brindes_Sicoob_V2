import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { searchCrm } from '@/lib/crm-db';
import { applyPixMask, validatePixKey } from '@/utils/pixMask';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCnpj, maskCep } from "@/utils/masks";
import { fetchAddressByCep } from '@/utils/viacep';
import { fetchCnpjData, type CnpjData } from '@/utils/cnpj-lookup';
import { invokeExternalDb, invokeExternalDbSingle } from '@/lib/external-db';
import { logger } from '@/lib/logger';
import { type SupplierContact, type PixKey, createEmptyContact, createEmptyPixKey, ORGANIZATION_ID } from './types';

function trimmedOrNull(value: string): string | null {
  return value.trim() || null;
}

function findPixDuplicate(keys: PixKey[]): string | null {
  const seen = new Set<string>();
  for (const key of keys) {
    const normalized = key.chave.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) return normalized;
    seen.add(normalized);
  }
  return null;
}

function validateNewSupplier(name: string, cnpj: string, pixKeys: PixKey[]): string | null {
  if (!name.trim()) return 'Nome do fornecedor é obrigatório';
  const duplicatePix = findPixDuplicate(pixKeys);
  if (duplicatePix) return `Chave PIX duplicada: "${duplicatePix}". Remova a duplicata antes de salvar.`;
  const invalidPix = pixKeys.find(key => key.chave.trim() && validatePixKey(key.chave, key.tipo));
  if (invalidPix) return validatePixKey(invalidPix.chave, invalidPix.tipo);
  const digits = cnpj.replace(/\D/g, '');
  return digits && !validateCnpj(digits) ? 'CNPJ informado é inválido' : null;
}

function validateLogoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Selecione uma imagem';
  if (file.size > 2 * 1024 * 1024) return 'Máximo 2MB';
  return null;
}

async function uploadSupplierLogo(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `suppliers/new-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('supplier-logos').upload(filePath, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('supplier-logos').getPublicUrl(filePath).data.publicUrl;
}

interface CnpjSetters {
  name: (value: string) => void;
  tradingName: (value: string) => void;
  street: (value: string) => void;
  number: (value: string) => void;
  complement: (value: string) => void;
  district: (value: string) => void;
  city: (value: string) => void;
  state: (value: string) => void;
  cep: (value: string) => void;
  email: (value: string) => void;
  phone: (value: string) => void;
}

function populateFromCnpj(data: CnpjData, setters: CnpjSetters): void {
  const assignments: Array<[string | null, (value: string) => void]> = [
    [data.razao_social, setters.name],
    [data.nome_fantasia, setters.tradingName],
    [data.logradouro, setters.street],
    [data.numero, setters.number],
    [data.complemento, setters.complement],
    [data.bairro, setters.district],
    [data.cidade, setters.city],
    [data.estado, setters.state],
    [data.cep ? maskCep(data.cep) : null, setters.cep],
    [data.email, setters.email],
    [data.telefone, setters.phone],
  ];
  for (const [value, setter] of assignments) {
    if (value) setter(value);
  }
}

interface DuplicateCandidate {
  value: string | null;
  field: 'cnpj' | 'name' | 'trading_name';
  select: string;
  description: string;
  logLabel: string;
}

async function queryNewSupplierDuplicate(candidate: DuplicateCandidate): Promise<string | null> {
  if (!candidate.value) return null;
  try {
    const result = await invokeExternalDb<Record<string, string>>({
      table: 'suppliers',
      operation: 'select',
      select: candidate.select,
      filters: { [candidate.field]: candidate.value },
      limit: 1,
    });
    const duplicate = result.records?.[0];
    if (!duplicate) return null;
    const displayName = duplicate[candidate.field] || duplicate.name;
    return `Já existe um fornecedor com ${candidate.description}: "${displayName}".`;
  } catch (error) {
    logger.warn(`[NewSupplierDialog] Falha ao verificar duplicidade de ${candidate.logLabel}:`, error);
    return null;
  }
}

async function findNewSupplierDuplicate(name: string, tradingName: string, cnpj: string): Promise<string | null> {
  const cnpjDigits = cnpj.replace(/\D/g, '');
  const candidates: DuplicateCandidate[] = [
    { value: cnpjDigits.length === 14 ? trimmedOrNull(cnpj) : null, field: 'cnpj', select: 'id,name,cnpj', description: 'este CNPJ', logLabel: 'CNPJ' },
    { value: trimmedOrNull(name), field: 'name', select: 'id,name', description: 'este nome', logLabel: 'nome' },
    { value: trimmedOrNull(tradingName), field: 'trading_name', select: 'id,name,trading_name', description: 'este Nome Fantasia', logLabel: 'nome fantasia' },
  ];
  for (const candidate of candidates) {
    const message = await queryNewSupplierDuplicate(candidate);
    if (message) return message;
  }
  return null;
}

function parseOptionalFloat(value: string): number | null {
  return value ? parseFloat(value) : null;
}

function parseOptionalInteger(value: string): number | null {
  return value ? parseInt(value) : null;
}

function buildSupplierCode(code: string, name: string): string {
  if (code.trim()) return code.trim();
  return name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20);
}

interface NewSupplierPayloadInput {
  name: string;
  code: string;
  tradingName: string;
  cnpj: string;
  active: boolean;
  contacts: SupplierContact[];
  address: string | null;
  website: string;
  defaultMarkup: string;
  minOrderValue: string;
  deliveryTimeDays: string;
  paymentTerms: string;
  shippingTerms: string;
  priority: string;
  notes: string | null;
  productSupplier: boolean;
  engravingSupplier: boolean;
  logoUrl: string;
}

function buildNewSupplierPayload(input: NewSupplierPayloadInput): Record<string, unknown> {
  const primaryContact = input.contacts[0] ?? createEmptyContact();
  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    name: input.name.trim(),
    code: buildSupplierCode(input.code, input.name),
    trading_name: trimmedOrNull(input.tradingName),
    cnpj: trimmedOrNull(input.cnpj),
    active: input.active,
    organization_id: ORGANIZATION_ID,
    contact_name: trimmedOrNull(primaryContact.name),
    contact_person: trimmedOrNull(primaryContact.role),
    email: trimmedOrNull(primaryContact.email),
    phone: trimmedOrNull(primaryContact.phone),
    address: input.address,
    website: trimmedOrNull(input.website),
    default_markup_percent: parseOptionalFloat(input.defaultMarkup),
    min_order_value: parseOptionalFloat(input.minOrderValue),
    minimum_order_value: parseOptionalFloat(input.minOrderValue),
    delivery_time_days: parseOptionalInteger(input.deliveryTimeDays),
    payment_terms: trimmedOrNull(input.paymentTerms),
    shipping_terms: trimmedOrNull(input.shippingTerms),
    priority: parseOptionalInteger(input.priority) ?? 50,
    notes: input.notes,
    is_product_supplier: input.productSupplier,
    is_engraving_supplier: input.engravingSupplier,
    created_at: now,
    updated_at: now,
  };
  if (input.logoUrl) data.logo_url = input.logoUrl;
  return data;
}

function buildSupplierAddress(parts: {
  streetType: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  cep: string;
}): string | null {
  const street = parts.streetType && parts.street ? `${parts.streetType} ${parts.street}` : parts.street;
  const values = [street, parts.number, parts.complement, parts.district, parts.city, parts.state];
  if (parts.cep) values.push(`CEP ${parts.cep}`);
  return values.filter(Boolean).join(', ') || null;
}

export function useNewSupplierForm(onCreated: (id: string) => void) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Basic
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [website, setWebsite] = useState('');
  const [foneFixo1, setFoneFixo1] = useState('');
  const [foneFixo2, setFoneFixo2] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('');
  const [estadoFaturamento, setEstadoFaturamento] = useState('');
  const [transportadoraPadrao, setTransportadoraPadrao] = useState('');
  const [transportadoraId, setTransportadoraId] = useState('');
  const [carrierSearch, setCarrierSearch] = useState('');
  const [carrierResults, setCarrierResults] = useState<Array<{ id: string; nome_fantasia: string; razao_social: string }>>([]);
  const [searchingCarriers, setSearchingCarriers] = useState(false);
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const carrierSearchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Social
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');

  // Contacts
  const [contacts, setContacts] = useState<SupplierContact[]>([createEmptyContact()]);

  // Address
  const [tipoLogradouro, setTipoLogradouro] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [pontoReferencia, setPontoReferencia] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [instrucoesEntrega, setInstrucoesEntrega] = useState('');

  // Commercial
  const [defaultMarkup, setDefaultMarkup] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [deliveryTimeDays, setDeliveryTimeDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [shippingTerms, setShippingTerms] = useState('');
  const [priority, setPriority] = useState('50');
  const [notes, setNotes] = useState('');

  // Financial
  const [formaPagamento, setFormaPagamento] = useState<string[]>([]);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([createEmptyPixKey(true)]);

  // Classification
  const [isProductSupplier, setIsProductSupplier] = useState(true);
  const [isEngravingSupplier, setIsEngravingSupplier] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const searchCarriers = useCallback(async (term: string) => {
    if (term.length < 2) { setCarrierResults([]); setShowCarrierDropdown(false); return; }
    setSearchingCarriers(true);
    try {
      const companies = await searchCrm<{ id: string; nome_fantasia: string; razao_social: string }>(
        'companies', 'razao_social', term, { select: 'id,nome_fantasia,razao_social', limit: 15 }
      ).catch(() => []);
      const list = (companies || []).filter(c => c.nome_fantasia || c.razao_social);
      setCarrierResults(list);
      setShowCarrierDropdown(list.length > 0);
    } catch {
      setCarrierResults([]);
    } finally {
      setSearchingCarriers(false);
    }
  }, []);

  const updatePixKey = (id: string, field: keyof Omit<PixKey, 'id'>, value: string | boolean) => {
    setPixKeys(prev => {
      const updated = prev.map(k => {
        if (k.id !== id) return field === 'principal' && value === true ? { ...k, principal: false } : k;
        const next = { ...k, [field]: value };
        if (field === 'tipo' && typeof value === 'string' && k.chave.trim()) {
          next.chave = applyPixMask(k.chave, value);
        }
        return next;
      });
      if (field === 'chave' && typeof value === 'string' && value.trim()) {
        const dup = findPixDuplicate(updated);
        if (dup) toast.warning(`Chave PIX "${dup}" já existe neste fornecedor`);
      }
      return updated;
    });
  };

  const addPixKey = () => setPixKeys(prev => [...prev, createEmptyPixKey(prev.length === 0)]);
  const removePixKey = (id: string) => setPixKeys(prev => {
    const next = prev.filter(k => k.id !== id);
    const firstKey = next[0];
    if (firstKey && !next.some((key) => key.principal)) firstKey.principal = true;
    return next.length > 0 ? next : [createEmptyPixKey(true)];
  });

  const updateContact = (id: string, field: keyof SupplierContact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const addContact = () => setContacts(prev => [...prev, createEmptyContact()]);
  const removeContact = (id: string) => setContacts(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);

  const resetForm = () => {
    setName(''); setCode(''); setTradingName(''); setCnpj('');
    setContacts([createEmptyContact()]); setWebsite(''); setFoneFixo1(''); setFoneFixo2('');
    setInstagram(''); setFacebook(''); setLinkedin(''); setYoutube(''); setTiktok('');
    setTipoLogradouro(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro('');
    setCidade(''); setEstado(''); setCep(''); setPais('Brasil');
    setPontoReferencia(''); setGoogleMapsUrl(''); setGooglePlaceId('');
    setLatitude(''); setLongitude(''); setHorarioFuncionamento(''); setInstrucoesEntrega('');
    setDefaultMarkup(''); setMinOrderValue(''); setDeliveryTimeDays('');
    setPaymentTerms(''); setShippingTerms(''); setPriority('50'); setNotes('');
    setFormaPagamento([]); setPixKeys([createEmptyPixKey(true)]);
    setIsProductSupplier(true); setIsEngravingSupplier(false); setIsActive(true);
    setInscricaoEstadual(''); setRegimeTributario(''); setEstadoFaturamento('');
    setTransportadoraPadrao(''); setTransportadoraId(''); setCarrierSearch(''); setCarrierResults([]); setShowCarrierDropdown(false);
    setLogoUrl('');
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateLogoFile(file);
    if (validationError) { toast.error(validationError); return; }
    setUploadingLogo(true);
    try {
      setLogoUrl(await uploadSupplierLogo(file));
      toast.success('Logo enviada');
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao enviar logo'));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCnpjLookup = async () => {
    const digits = cnpj.replace(/\D/g, '');
    if (!validateCnpj(digits)) { setCnpjError('CNPJ inválido'); return; }
    setFetchingCnpj(true);
    try {
      const data = await fetchCnpjData(digits);
      if (data) {
        const primaryContactId = contacts[0]?.id;
        populateFromCnpj(data, {
          name: setName,
          tradingName: setTradingName,
          street: setLogradouro,
          number: setNumero,
          complement: setComplemento,
          district: setBairro,
          city: setCidade,
          state: setEstado,
          cep: setCep,
          email: value => { if (primaryContactId) updateContact(primaryContactId, 'email', value); },
          phone: value => { if (primaryContactId) updateContact(primaryContactId, 'phone', value); },
        });
        toast.success('Dados preenchidos via CNPJ!');
      }
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao consultar CNPJ'));
    } finally {
      setFetchingCnpj(false);
    }
  };

  const handleCepLookup = async (masked: string) => {
    setCep(masked);
    if (masked.replace(/\D/g, '').length === 8) {
      const addr = await fetchAddressByCep(masked);
      if (addr) {
        if (addr.logradouro) setLogradouro(addr.logradouro);
        if (addr.bairro) setBairro(addr.bairro);
        if (addr.localidade) setCidade(addr.localidade);
        if (addr.uf) setEstado(addr.uf);
        toast.success('Endereço preenchido via CEP');
      }
    }
  };

  const handleCreate = async () => {
    const validationError = validateNewSupplier(name, cnpj, pixKeys);
    if (validationError) {
      if (validationError.includes('CNPJ')) setCnpjError('CNPJ inválido');
      toast.error(validationError);
      return;
    }
    setCnpjError('');
    setSaving(true);
    try {
      const duplicateError = await findNewSupplierDuplicate(name, tradingName, cnpj);
      if (duplicateError) { toast.error(duplicateError); return; }
      const address = buildSupplierAddress({
        streetType: tipoLogradouro, street: logradouro, number: numero, complement: complemento,
        district: bairro, city: cidade, state: estado, cep,
      });
      const notesValue = buildNotesField({
        notes, contacts, paymentMethods: formaPagamento, pixKeys, phone1: foneFixo1, phone2: foneFixo2,
        registration: inscricaoEstadual, taxRegime: regimeTributario, billingState: estadoFaturamento,
        carrierName: transportadoraPadrao, carrierId: transportadoraId,
      });
      const data = buildNewSupplierPayload({
        name, code, tradingName, cnpj, active: isActive, contacts, address, website,
        defaultMarkup, minOrderValue, deliveryTimeDays, paymentTerms, shippingTerms, priority,
        notes: notesValue, productSupplier: isProductSupplier, engravingSupplier: isEngravingSupplier, logoUrl,
      });
      const result = await invokeExternalDbSingle<{ id: string }>({ table: 'suppliers', operation: 'insert', data });
      if (result?.id) {
        onCreated(result.id);
        toast.success(`Fornecedor "${name.trim()}" criado com sucesso`);
        setOpen(false);
        resetForm();
      }
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao criar fornecedor'));
    } finally {
      setSaving(false);
    }
  };

  return {
    open, setOpen, saving, logoUrl, setLogoUrl, uploadingLogo, logoInputRef,
    name, setName, code, setCode, tradingName, setTradingName,
    cnpj, setCnpj, cnpjError, setCnpjError, fetchingCnpj,
    website, setWebsite, foneFixo1, setFoneFixo1, foneFixo2, setFoneFixo2,
    inscricaoEstadual, setInscricaoEstadual, regimeTributario, setRegimeTributario,
    estadoFaturamento, setEstadoFaturamento,
    transportadoraPadrao, setTransportadoraPadrao, transportadoraId, setTransportadoraId,
    carrierSearch, setCarrierSearch, carrierResults, searchingCarriers, showCarrierDropdown, setShowCarrierDropdown, carrierSearchTimeout,
    instagram, setInstagram, facebook, setFacebook, linkedin, setLinkedin, youtube, setYoutube, tiktok, setTiktok,
    contacts, updateContact, addContact, removeContact,
    tipoLogradouro, setTipoLogradouro, logradouro, setLogradouro, numero, setNumero,
    complemento, setComplemento, bairro, setBairro, cidade, setCidade, estado, setEstado,
    cep, pais, setPais, pontoReferencia, setPontoReferencia,
    googleMapsUrl, setGoogleMapsUrl, googlePlaceId, setGooglePlaceId,
    latitude, setLatitude, longitude, setLongitude,
    horarioFuncionamento, setHorarioFuncionamento, instrucoesEntrega, setInstrucoesEntrega,
    defaultMarkup, setDefaultMarkup, minOrderValue, setMinOrderValue,
    deliveryTimeDays, setDeliveryTimeDays, paymentTerms, setPaymentTerms,
    shippingTerms, setShippingTerms, priority, setPriority, notes, setNotes,
    formaPagamento, setFormaPagamento, pixKeys, updatePixKey, addPixKey, removePixKey,
    isProductSupplier, setIsProductSupplier, isEngravingSupplier, setIsEngravingSupplier,
    isActive, setIsActive,
    searchCarriers, handleLogoUpload, handleCnpjLookup, handleCepLookup, handleCreate,
  };
}

export type NewSupplierFormState = ReturnType<typeof useNewSupplierForm>;

interface NotesFieldInput {
  notes: string;
  contacts: SupplierContact[];
  paymentMethods: string[];
  pixKeys: PixKey[];
  phone1: string;
  phone2: string;
  registration: string;
  taxRegime: string;
  billingState: string;
  carrierName: string;
  carrierId: string;
}

function buildNotesField(input: NotesFieldInput): string | null {
  const parts = [
    trimmedOrNull(input.notes),
    ...buildContactNotes(input.contacts),
    buildFinancialNote(input.paymentMethods, input.pixKeys),
    buildPhoneNote(input.phone1, input.phone2),
    buildFiscalNote(input.registration, input.taxRegime, input.billingState),
    buildCarrierNote(input.carrierName, input.carrierId),
  ].filter((part): part is string => Boolean(part));
  return parts.join('\n') || null;
}

function buildPrimaryContactNote(contact: SupplierContact | undefined): string | null {
  if (!contact) return null;
  const signature = contact.signature?.trim() || '';
  const nickname = contact.nickname?.trim() || '';
  if (!signature && !nickname) return null;
  return `[Contato 1 extras: Assinatura: ${signature || '-'}, Apelido: ${nickname || '-'}]`;
}

function serializeExtraContact(contact: SupplierContact): string {
  const signature = contact.signature?.trim() || '-';
  const nickname = contact.nickname?.trim() || '-';
  return `${contact.role || 'N/A'} - ${contact.name} (${contact.email || '-'}, ${contact.phone || '-'}, Assinatura: ${signature}, Apelido: ${nickname})`;
}

function buildExtraContactsNote(contacts: SupplierContact[]): string | null {
  const extras = contacts.slice(1).filter(contact => contact.name.trim()).map(serializeExtraContact);
  return extras.length > 0 ? `[Contatos adicionais: ${extras.join('; ')}]` : null;
}

function buildContactNotes(contacts: SupplierContact[]): Array<string | null> {
  return [buildPrimaryContactNote(contacts[0]), buildExtraContactsNote(contacts)];
}

function serializePixKey(key: PixKey): string {
  return `${key.tipo || '-'}|${key.chave}|${key.favorecido || '-'}|${key.principal ? '1' : '0'}`;
}

function buildFinancialNote(paymentMethods: string[], pixKeys: PixKey[]): string | null {
  const populatedKeys = pixKeys.filter(key => key.chave.trim());
  if (paymentMethods.length === 0 && populatedKeys.length === 0) return null;
  const date = new Date().toISOString().split('T')[0];
  const methods = paymentMethods.join(',') || '-';
  const pixData = populatedKeys.map(serializePixKey).join(';;') || '-';
  return `[Financeiro: Forma: ${methods}, PIX: ${pixData}, PIX Atualizado: ${date}]`;
}

function buildPhoneNote(phone1: string, phone2: string): string | null {
  const primary = phone1.trim();
  const secondary = phone2.trim();
  return primary || secondary ? `[Fones Fixos: 01: ${primary || '-'}, 02: ${secondary || '-'}]` : null;
}

function buildFiscalNote(registration: string, regime: string, state: string): string | null {
  const normalizedRegistration = registration.trim();
  if (!normalizedRegistration && !regime && !state) return null;
  return `[Fiscal: IE: ${normalizedRegistration || '-'}, Regime: ${regime || '-'}, UF Faturamento: ${state || '-'}]`;
}

function buildCarrierNote(name: string, id: string): string | null {
  const normalizedName = name.trim();
  return normalizedName ? `[Transportadora: ${normalizedName}, ID: ${id || '-'}]` : null;
}
