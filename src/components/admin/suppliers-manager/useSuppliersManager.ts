import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { applyPixMask, validatePixKey } from '@/utils/pixMask';
import { invokeExternalDb, invokeExternalDbSingle, invokeExternalDbDelete } from '@/lib/external-db';
import { searchCrm } from '@/lib/crm-db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateCnpj, maskCep } from '@/utils/masks';
import { fetchAddressByCep } from '@/utils/viacep';
import { fetchCnpjData, type CnpjData } from '@/utils/cnpj-lookup';
import { logger } from "@/lib/logger";
import { type Supplier, type SupplierContact, type PixKey, EMPTY_SUPPLIER, ORGANIZATION_ID, createEmptyContact, createEmptyPixKey } from "./types";

type SupplierFilterType = 'all' | 'product' | 'engraving';
type SupplierFilterStatus = 'all' | 'active' | 'inactive';

interface SupplierPaymentState {
  methods: string[];
  pixKeys: PixKey[];
}

function valueOrEmpty(value: string | null | undefined): string {
  return value ?? '';
}

function valueOrNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function valueOrDefault<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function trimmedOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function createLegacyContact(supplier: Supplier): SupplierContact {
  const contact = createEmptyContact();
  if (supplier.contact_name) contact.name = supplier.contact_name;
  if (supplier.contact_person) contact.role = supplier.contact_person;
  if (supplier.email) contact.email = supplier.email;
  if (supplier.phone) contact.phone = supplier.phone;
  return contact;
}

function parseSupplierContacts(supplier: Supplier): SupplierContact[] {
  try {
    const parsed: unknown = supplier.contacts ? JSON.parse(supplier.contacts) : null;
    if (!Array.isArray(parsed) || parsed.length === 0) return [createLegacyContact(supplier)];
    return parsed.map((contact: Record<string, unknown>) => ({
      ...contact,
      id: typeof contact.id === 'string' && contact.id ? contact.id : crypto.randomUUID(),
    } as SupplierContact));
  } catch {
    return [createEmptyContact()];
  }
}

function ensurePrimaryPixKey(keys: PixKey[]): PixKey[] {
  if (keys.length === 0) return [createEmptyPixKey(true)];
  if (keys.some(key => key.principal)) return keys;
  return keys.map((key, index) => index === 0 ? { ...key, principal: true } : key);
}

function parseCurrentPayment(match: RegExpMatchArray): SupplierPaymentState {
  const methods = match[1] && match[1] !== '-' ? match[1].split(',').filter(Boolean) : [];
  if (!match[2] || match[2] === '-') return { methods, pixKeys: [createEmptyPixKey(true)] };
  const keys = match[2].split(';;').map(entry => {
    const [type = '', key = '', recipient = '', primary = '0'] = entry.split('|');
    return {
      id: crypto.randomUUID(),
      tipo: type === '-' ? '' : type,
      chave: key,
      favorecido: recipient === '-' ? '' : recipient,
      principal: primary === '1',
    };
  });
  return { methods, pixKeys: ensurePrimaryPixKey(keys) };
}

function parseLegacyPayment(match: RegExpMatchArray): SupplierPaymentState {
  const methods = match[1] && match[1] !== '-' ? match[1].split(',').filter(Boolean) : [];
  const key = match[3] && match[3] !== '-' ? match[3] : '';
  if (!key) return { methods, pixKeys: [createEmptyPixKey(true)] };
  return {
    methods,
    pixKeys: [{
      id: crypto.randomUUID(),
      tipo: match[2] && match[2] !== '-' ? match[2] : '',
      chave: key,
      favorecido: match[4] && match[4] !== '-' ? match[4] : '',
      principal: true,
    }],
  };
}

function parseSupplierPayment(notes: string): SupplierPaymentState {
  const current = notes.match(/\[Financeiro: Forma: (.*?), PIX: (.*?), PIX Atualizado: (.*?)\]/);
  if (current) return parseCurrentPayment(current);
  const legacy = notes.match(/\[Financeiro: Forma: (.*?), PIX Tipo: (.*?), PIX Número: (.*?), PIX Favorecido: (.*?), PIX Atualizado: (.*?)\]/);
  return legacy ? parseLegacyPayment(legacy) : { methods: [], pixKeys: [createEmptyPixKey(true)] };
}

function legacyValue(value: string | undefined): string {
  return value === '-' ? '' : valueOrEmpty(value);
}

function deriveFiscalIdentity(supplier: Supplier, notes: string) {
  const dedicated = {
    registration: valueOrEmpty(supplier.inscricao_estadual),
    regime: valueOrEmpty(supplier.tax_regime),
    state: valueOrEmpty(supplier.state_uf),
  };
  if (dedicated.registration || dedicated.regime || dedicated.state) return dedicated;
  const match = notes.match(/\[Fiscal: IE: (.*?), Regime: (.*?), UF Faturamento: (.*?)\]/);
  return {
    registration: legacyValue(match?.[1]),
    regime: legacyValue(match?.[2]),
    state: legacyValue(match?.[3]),
  };
}

function derivePhone2(supplier: Supplier, notes: string): string {
  if (supplier.phone2) return supplier.phone2;
  const match = notes.match(/\[Fones Fixos: 01: (.*?), 02: (.*?)\]/);
  return legacyValue(match?.[2]);
}

function deriveFiscalFields(supplier: Supplier, notes: string) {
  return { ...deriveFiscalIdentity(supplier, notes), phone2: derivePhone2(supplier, notes) };
}

function deriveCarrier(notes: string) {
  const match = notes.match(/\[Transportadora: (.*?), ID: (.*?)\]/);
  return {
    name: match?.[1] === '-' ? '' : valueOrEmpty(match?.[1]),
    id: match?.[2] === '-' ? '' : valueOrEmpty(match?.[2]),
  };
}

function matchesSupplierSearch(supplier: Supplier, query: string): boolean {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return [supplier.name, supplier.code, supplier.trading_name, supplier.cnpj, supplier.email]
    .some(value => value?.toLowerCase().includes(normalized));
}

function matchesSupplierType(supplier: Supplier, filter: SupplierFilterType): boolean {
  if (filter === 'product') return !!supplier.is_product_supplier;
  if (filter === 'engraving') return !!supplier.is_engraving_supplier;
  return true;
}

function matchesSupplierStatus(supplier: Supplier, filter: SupplierFilterStatus): boolean {
  if (filter === 'active') return !!supplier.active;
  if (filter === 'inactive') return !supplier.active;
  return true;
}

function validateSupplierDraft(supplier: Partial<Supplier> | null, pixKeys: PixKey[]): string | null {
  if (!supplier?.name?.trim()) return 'Nome é obrigatório';
  const duplicatePix = findPixDuplicate(pixKeys);
  if (duplicatePix) return `Chave PIX duplicada: "${duplicatePix}". Remova a duplicata antes de salvar.`;
  const invalidPix = pixKeys.find(key => key.chave.trim() && validatePixKey(key.chave, key.tipo));
  if (invalidPix) return validatePixKey(invalidPix.chave, invalidPix.tipo);
  const cnpj = supplier.cnpj?.replace(/\D/g, '') || '';
  return cnpj && !validateCnpj(cnpj) ? 'CNPJ informado é inválido' : null;
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

interface DuplicateCandidate {
  value: string | null;
  field: 'cnpj' | 'name' | 'trading_name';
  select: string;
  label: string;
}

async function querySupplierDuplicate(
  candidate: DuplicateCandidate,
  editingId: string | undefined,
): Promise<string | null> {
  if (!candidate.value) return null;
  try {
    const result = await invokeExternalDb<Record<string, string>>({
      table: 'suppliers',
      operation: 'select',
      select: candidate.select,
      filters: { [candidate.field]: candidate.value },
      limit: 5,
    });
    const duplicate = result.records?.find(record => record.id !== editingId);
    const displayName = duplicate?.[candidate.field] || duplicate?.name;
    return duplicate ? `Já existe outro fornecedor com ${candidate.label}: "${displayName}".` : null;
  } catch (error) {
    logger.warn(`[SuppliersManager] ${candidate.field} dup check failed:`, error);
    return null;
  }
}

async function findSupplierDuplicate(supplier: Partial<Supplier>): Promise<string | null> {
  const cnpj = supplier.cnpj?.replace(/\D/g, '') || '';
  const candidates: DuplicateCandidate[] = [
    { value: cnpj.length === 14 ? supplier.cnpj?.trim() || null : null, field: 'cnpj', select: 'id,name,cnpj', label: 'este CNPJ' },
    { value: trimmedOrNull(supplier.name), field: 'name', select: 'id,name', label: 'este nome' },
    { value: trimmedOrNull(supplier.trading_name), field: 'trading_name', select: 'id,name,trading_name', label: 'este Nome Fantasia' },
  ];
  for (const candidate of candidates) {
    const message = await querySupplierDuplicate(candidate, supplier.id);
    if (message) return message;
  }
  return null;
}

function buildSupplierAddress(supplier: Partial<Supplier>): string | null {
  const street = supplier.tipo_logradouro && supplier.logradouro
    ? `${supplier.tipo_logradouro} ${supplier.logradouro}`
    : supplier.logradouro;
  const parts = [street, supplier.numero, supplier.complemento, supplier.bairro, supplier.cidade, supplier.estado];
  if (supplier.cep) parts.push(`CEP ${supplier.cep}`);
  return parts.filter(Boolean).join(', ') || trimmedOrNull(supplier.address);
}

function buildSupplierCode(supplier: Partial<Supplier>): string {
  if (supplier.code?.trim()) return supplier.code.trim();
  return (supplier.name || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20);
}

interface SupplierPayloadInput {
  supplier: Partial<Supplier>;
  contacts: SupplierContact[];
  pixKeys: PixKey[];
  paymentMethods: string[];
  phone1: string;
  phone2: string;
  registration: string;
  taxRegime: string;
  billingState: string;
  carrierName: string;
  carrierId: string;
}

function buildSupplierPayload(input: SupplierPayloadInput): Record<string, unknown> {
  const { supplier, contacts } = input;
  const primaryContact = contacts[0];
  return {
    name: (supplier.name || '').trim(),
    code: buildSupplierCode(supplier),
    trading_name: trimmedOrNull(supplier.trading_name),
    cnpj: trimmedOrNull(supplier.cnpj),
    active: valueOrDefault(supplier.active, true),
    contact_name: trimmedOrNull(primaryContact?.name),
    contact_person: trimmedOrNull(primaryContact?.role),
    email: trimmedOrNull(primaryContact?.email),
    phone: trimmedOrNull(input.phone1) ?? trimmedOrNull(primaryContact?.phone),
    phone2: trimmedOrNull(input.phone2),
    address: buildSupplierAddress(supplier),
    website: trimmedOrNull(supplier.website),
    default_markup_percent: valueOrNull(supplier.default_markup_percent),
    min_order_value: valueOrNull(supplier.min_order_value),
    minimum_order_value: valueOrNull(supplier.min_order_value),
    delivery_time_days: valueOrNull(supplier.delivery_time_days),
    payment_terms: trimmedOrNull(supplier.payment_terms),
    shipping_terms: trimmedOrNull(supplier.shipping_terms),
    priority: valueOrDefault(supplier.priority, 50),
    inscricao_estadual: trimmedOrNull(input.registration),
    tax_regime: trimmedOrNull(input.taxRegime),
    state_uf: trimmedOrNull(input.billingState),
    notes: buildNotesPayload({ supplier, contacts, paymentMethods: input.paymentMethods, pixKeys: input.pixKeys, carrierName: input.carrierName, carrierId: input.carrierId }),
    is_product_supplier: valueOrDefault(supplier.is_product_supplier, true),
    is_engraving_supplier: valueOrDefault(supplier.is_engraving_supplier, false),
    updated_at: new Date().toISOString(),
  };
}

async function persistSupplier(supplier: Partial<Supplier>, payload: Record<string, unknown>, isNew: boolean) {
  if (isNew) {
    payload.organization_id = ORGANIZATION_ID;
    payload.created_at = payload.updated_at;
    await invokeExternalDbSingle({ table: 'suppliers', operation: 'insert', data: payload });
    return `Fornecedor "${supplier.name}" criado`;
  }
  await invokeExternalDbSingle({ table: 'suppliers', operation: 'update', id: supplier.id, data: payload });
  return `Fornecedor "${supplier.name}" atualizado`;
}

function validateLogoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Selecione um arquivo de imagem';
  if (file.size > 2 * 1024 * 1024) return 'Imagem deve ter no máximo 2MB';
  return null;
}

async function uploadSupplierLogo(file: File, supplierId: string): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `suppliers/${supplierId}.${extension}`;
  const { error } = await supabase.storage.from('supplier-logos').upload(filePath, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('supplier-logos').getPublicUrl(filePath).data.publicUrl;
}

type SupplierFieldUpdater = (field: string, value: unknown) => void;

const CNPJ_FIELD_MAPPINGS = [
  ['razao_social', 'name'],
  ['nome_fantasia', 'trading_name'],
  ['logradouro', 'logradouro'],
  ['numero', 'numero'],
  ['complemento', 'complemento'],
  ['bairro', 'bairro'],
  ['cidade', 'cidade'],
  ['estado', 'estado'],
  ['email', 'email'],
  ['telefone', 'phone'],
] as const satisfies ReadonlyArray<readonly [keyof CnpjData, string]>;

function populateSupplierFromCnpj(data: CnpjData, updateField: SupplierFieldUpdater): void {
  for (const [source, destination] of CNPJ_FIELD_MAPPINGS) {
    const value = data[source];
    if (value) updateField(destination, value);
  }
  if (data.cep) updateField('cep', maskCep(data.cep));
}

export function useSuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<SupplierFilterType>('all');
  const [filterStatus, setFilterStatus] = useState<SupplierFilterStatus>('all');
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [contacts, setContacts] = useState<SupplierContact[]>([createEmptyContact()]);
  const [formaPagamento, setFormaPagamento] = useState<string[]>([]);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([createEmptyPixKey(true)]);
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
  const logoInputRef = useRef<HTMLInputElement>(null);

  const searchCarriers = useCallback(async (term: string) => {
    if (term.length < 2) { setCarrierResults([]); setShowCarrierDropdown(false); return; }
    setSearchingCarriers(true);
    try {
      const companies = await searchCrm<{ id: string; nome_fantasia: string; razao_social: string }>(
        'companies',
        'razao_social',
        term,
        {
          select: 'id,nome_fantasia,razao_social',
          limit: 15,
        }
      ).catch(() => []);
      const list = (companies || []).filter(c => c.nome_fantasia || c.razao_social);
      setCarrierResults(list);
      setShowCarrierDropdown(list.length > 0);
    } catch { setCarrierResults([]); } finally { setSearchingCarriers(false); }
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
    if (next.length > 0 && !next.some(k => k.principal)) { const first = next[0]; if (first) first.principal = true; }
    return next.length > 0 ? next : [createEmptyPixKey(true)];
  });

  const updateContact = (id: string, field: keyof SupplierContact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const addContact = () => setContacts(prev => [...prev, createEmptyContact()]);
  const removeContact = (id: string) => setContacts(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invokeExternalDb<Supplier>({
        table: 'suppliers', operation: 'select', select: '*',
        orderBy: { column: 'name', ascending: true }, limit: 200,
      });
      setSuppliers(result.records || []);
    } catch {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter(supplier =>
      matchesSupplierType(supplier, filterType) &&
      matchesSupplierStatus(supplier, filterStatus) &&
      matchesSupplierSearch(supplier, search)
    );
  }, [suppliers, search, filterType, filterStatus]);

  const handleNew = () => { setEditingSupplier({ ...EMPTY_SUPPLIER }); setContacts([createEmptyContact()]); setIsNew(true); };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier({
      ...supplier,
      ...parseJsonObject(supplier.address_details),
      ...parseJsonObject(supplier.social_details),
    } as Partial<Supplier>);
    setContacts(parseSupplierContacts(supplier));

    const notes = valueOrEmpty(supplier.notes);
    const payment = parseSupplierPayment(notes);
    setFormaPagamento(payment.methods);
    setPixKeys(payment.pixKeys);

    const fiscal = deriveFiscalFields(supplier, notes);
    setFoneFixo1(valueOrEmpty(supplier.phone));
    setFoneFixo2(fiscal.phone2);
    setInscricaoEstadual(fiscal.registration);
    setRegimeTributario(fiscal.regime);
    setEstadoFaturamento(fiscal.state);

    const carrier = deriveCarrier(notes);
    setTransportadoraPadrao(carrier.name);
    setTransportadoraId(carrier.id);
    setCarrierSearch(''); setCarrierResults([]); setShowCarrierDropdown(false);

    setIsNew(false);
  };

  const handleSave = async () => {
    const validationError = validateSupplierDraft(editingSupplier, pixKeys);
    if (validationError) { toast.error(validationError); return; }
    if (!editingSupplier) return;
    setSaving(true);

    try {
      const duplicateError = await findSupplierDuplicate(editingSupplier);
      if (duplicateError) { toast.error(duplicateError); return; }

      const payload = buildSupplierPayload({
        supplier: editingSupplier,
        contacts,
        pixKeys,
        paymentMethods: formaPagamento,
        phone1: foneFixo1,
        phone2: foneFixo2,
        registration: inscricaoEstadual,
        taxRegime: regimeTributario,
        billingState: estadoFaturamento,
        carrierName: transportadoraPadrao,
        carrierId: transportadoraId,
      });

      if (editingSupplier.logo_url) payload.logo_url = editingSupplier.logo_url;
      if (!isNew && editingSupplier.logo_url === null) payload.logo_url = null;

      toast.success(await persistSupplier(editingSupplier, payload, isNew));
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao salvar fornecedor'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Deseja realmente excluir o fornecedor "${supplier.name}"?`)) return;
    setDeleting(supplier.id);
    try {
      await invokeExternalDbDelete('suppliers', supplier.id);
      toast.success(`Fornecedor "${supplier.name}" excluído`);
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao excluir fornecedor');
    } finally { setDeleting(null); }
  };

  const updateField = (field: string, value: unknown) => {
    setEditingSupplier(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateLogoFile(file);
    if (validationError) { toast.error(validationError); return; }
    setUploadingLogo(true);
    try {
      const supplierId = editingSupplier?.id || `new-${Date.now()}`;
      updateField('logo_url', await uploadSupplierLogo(file, supplierId));
      toast.success('Logo enviada com sucesso');
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao enviar logo'));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCnpjLookup = async () => {
    const digits = (editingSupplier?.cnpj?.replace(/\D/g, '') || '');
    if (!validateCnpj(digits)) { toast.error('CNPJ inválido'); return; }
    setFetchingCnpj(true);
    try {
      const data = await fetchCnpjData(digits);
      if (data) {
        populateSupplierFromCnpj(data, updateField);
        toast.success('Dados preenchidos via CNPJ!');
      }
    } catch (err: unknown) {
      toast.error(((err as Error).message || 'Erro ao consultar CNPJ'));
    } finally { setFetchingCnpj(false); }
  };

  const handleCepLookup = async (cep: string) => {
    const masked = maskCep(cep);
    updateField('cep', masked);
    if (masked.replace(/\D/g, '').length === 8) {
      const addr = await fetchAddressByCep(masked);
      if (addr) {
        if (addr.logradouro) updateField('logradouro', addr.logradouro);
        if (addr.bairro) updateField('bairro', addr.bairro);
        if (addr.localidade) updateField('cidade', addr.localidade);
        if (addr.uf) updateField('estado', addr.uf);
        toast.success('Endereço preenchido via CEP');
      }
    }
  };

  return {
    suppliers, loading, search, setSearch, filterType, setFilterType, filterStatus, setFilterStatus,
    editingSupplier, setEditingSupplier, isNew, saving, deleting,
    uploadingLogo, fetchingCnpj, contacts, setContacts,
    formaPagamento, setFormaPagamento, pixKeys, setPixKeys,
    foneFixo1, setFoneFixo1, foneFixo2, setFoneFixo2,
    inscricaoEstadual, setInscricaoEstadual, regimeTributario, setRegimeTributario,
    estadoFaturamento, setEstadoFaturamento,
    transportadoraPadrao, setTransportadoraPadrao, transportadoraId, setTransportadoraId,
    carrierSearch, setCarrierSearch, carrierResults, searchingCarriers, showCarrierDropdown, setShowCarrierDropdown,
    searchCarriers, carrierSearchTimeout,
    logoInputRef,
    filtered, handleNew, handleEdit, handleSave, handleDelete, updateField,
    handleLogoUpload, handleCnpjLookup, handleCepLookup, fetchSuppliers,
    updatePixKey, addPixKey, removePixKey, updateContact, addContact, removeContact,
  };
}

interface NotesPayloadInput {
  supplier: Partial<Supplier>;
  contacts: SupplierContact[];
  paymentMethods: string[];
  pixKeys: PixKey[];
  carrierName: string;
  carrierId: string;
}

function buildNotesPayload({ supplier, contacts, paymentMethods, pixKeys, carrierName, carrierId }: NotesPayloadInput): string | null {
  const parts = [
    sanitizeSupplierNotes(supplier.notes),
    ...buildContactNotes(contacts),
    buildFinancialNote(paymentMethods, pixKeys),
    buildCarrierNote(carrierName, carrierId),
  ].filter((part): part is string => Boolean(part));
  return parts.join('\n') || null;
}

function sanitizeSupplierNotes(notes: string | null | undefined): string | null {
  const sanitized = valueOrEmpty(notes).trim()
    .replace(/\[Contato 1 extras:.*?\]/g, '')
    .replace(/\[Contatos adicionais:.*?\]/g, '')
    .replace(/\[Redes Sociais:.*?\]/g, '')
    .replace(/\[Financeiro:.*?\]/g, '')
    .replace(/\[Fones Fixos:.*?\]/g, '')
    .replace(/\[Fiscal:.*?\]/g, '')
    .replace(/\[Transportadora:.*?\]/g, '')
    .trim();
  return sanitized || null;
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

function buildCarrierNote(name: string, id: string): string | null {
  const normalizedName = name.trim();
  return normalizedName ? `[Transportadora: ${normalizedName}, ID: ${id || '-'}]` : null;
}
