import { type RefObject, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Building2, User, Search, X, Loader2, Phone, Mail, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { searchCrm, selectCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany, type CrmContact, type CrmContactEmail, type CrmContactPhone } from "@/types/crm";

interface CompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
}

interface ContactOption {
  id: string;
  name: string;
  cargo: string | null;
  email: string | null;
  phone: string | null;
}

export interface ShareContactSelection {
  companyId: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface ShareContactSelectorProps {
  onSelect: (selection: ShareContactSelection | null) => void;
  selection: ShareContactSelection | null;
}

function ContactButton({ contact, isSelected, onSelect }: { contact: ContactOption; isSelected: boolean; onSelect: (contact: ContactOption) => void }) {
  return (
    <button type="button" onClick={() => onSelect(contact)} className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors", isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent")}>
      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{contact.name}</span>
        {contact.cargo && <span className="text-muted-foreground ml-1">· {contact.cargo}</span>}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {contact.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {contact.phone}</span>}
          {contact.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> {contact.email}</span>}
        </div>
      </div>
      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

function SelectedCompanyView({ company, contacts, loading, selectedContactId, onClear, onSelectContact }: { company: CompanyOption; contacts: ContactOption[]; loading: boolean; selectedContactId?: string; onClear: () => void; onSelectContact: (contact: ContactOption) => void }) {
  let contactContent = <p className="text-xs text-muted-foreground p-2">Nenhum contato encontrado</p>;
  if (loading) {
    contactContent = <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando contatos...</div>;
  } else if (contacts.length > 0) {
    contactContent = (
      <ScrollArea className="max-h-32">
        <div className="space-y-1">
          {contacts.map((contact) => <ContactButton key={contact.id} contact={contact} isSelected={selectedContactId === contact.id} onSelect={onSelectContact} />)}
        </div>
      </ScrollArea>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{company.name}</p>
          {company.cnpj && <p className="text-xs text-muted-foreground">{company.cnpj}</p>}
        </div>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="h-3.5 w-3.5" /></button>
      </div>
      {contactContent}
    </div>
  );
}

function CompanyDropdown({ companies, loading, onSelect }: { companies: CompanyOption[]; loading: boolean; onSelect: (company: CompanyOption) => void }) {
  if (loading) return <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</div>;
  if (companies.length === 0) return <p className="p-3 text-sm text-muted-foreground">Nenhuma empresa encontrada</p>;
  return (
    <ScrollArea className="max-h-48">
      {companies.map((company) => (
        <button key={company.id} type="button" onClick={() => onSelect(company)} className="w-full flex items-center gap-2 p-2.5 hover:bg-accent text-left text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{company.name}</p>
            {company.cnpj && <p className="text-xs text-muted-foreground">{company.cnpj}</p>}
          </div>
        </button>
      ))}
    </ScrollArea>
  );
}

function CompanySearch({ search, debouncedSearch, showDropdown, companies, loading, containerRef, setSearch, setShowDropdown, onSelect }: { search: string; debouncedSearch: string; showDropdown: boolean; companies: CompanyOption[]; loading: boolean; containerRef: RefObject<HTMLDivElement>; setSearch: (value: string) => void; setShowDropdown: (value: boolean) => void; onSelect: (company: CompanyOption) => void }) {
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar empresa do CRM..." value={search} onChange={(event) => { setSearch(event.target.value); setShowDropdown(true); }} onFocus={() => { if (search.length >= 2) setShowDropdown(true); }} className="pl-8 h-9 text-sm" />
      </div>
      {showDropdown && debouncedSearch.length >= 2 && <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md"><CompanyDropdown companies={companies} loading={loading} onSelect={onSelect} /></div>}
    </div>
  );
}

async function findCompanies(search: string): Promise<CompanyOption[]> {
  if (search.length < 2) return [];
  const results = await searchCrm<CrmCompany>("companies", "razao_social", search, { select: "id, razao_social, nome_fantasia, cnpj, logo_url", limit: 10 });
  return results.map((company) => ({ id: company.id, name: getCompanyDisplayName(company), razao_social: company.razao_social, nome_fantasia: company.nome_fantasia, cnpj: company.cnpj }));
}

async function contactChannel<T>(table: "contact_emails" | "contact_phones", contactId: string, select: string) {
  try { return await selectCrm<T>(table, { select, filters: { contact_id: contactId, is_primary: true }, limit: 1 }); }
  catch { return []; }
}

async function findContacts(companyId: string): Promise<ContactOption[]> {
  const contacts = await selectCrm<CrmContact>("contacts", { select: "id, first_name, last_name, full_name, cargo", filters: { company_id: companyId }, limit: 20 });
  return Promise.all(contacts.map(async (contact) => {
    const [emails, phones] = await Promise.all([
      contactChannel<CrmContactEmail>("contact_emails", contact.id, "email"),
      contactChannel<CrmContactPhone>("contact_phones", contact.id, "numero, numero_e164"),
    ]);
    return { id: contact.id, name: contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(" "), cargo: contact.cargo, email: emails[0]?.email ?? null, phone: phones[0]?.numero_e164 ?? phones[0]?.numero ?? null };
  }));
}

function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), 300); return () => clearTimeout(timer); }, [value]);
  return debounced;
}

function useCloseOnOutsideClick(ref: RefObject<HTMLDivElement>, close: () => void) {
  useEffect(() => {
    const handler = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close, ref]);
}

export function ShareContactSelector({ onSelect, selection }: ShareContactSelectorProps) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(search);
  useCloseOnOutsideClick(ref, () => setShowDropdown(false));
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["share-company-search", debouncedSearch],
    queryFn: () => findCompanies(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 60_000,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["share-contacts", selectedCompany?.id],
    queryFn: () => selectedCompany ? findContacts(selectedCompany.id) : [],
    enabled: !!selectedCompany,
    staleTime: 60_000,
  });

  const handleSelectCompany = (company: CompanyOption) => { setSelectedCompany(company); setSearch(""); setShowDropdown(false); onSelect({ companyId: company.id, companyName: company.name }); };

  const handleSelectContact = (contact: ContactOption) => {
    if (!selectedCompany) return;
    onSelect({ companyId: selectedCompany.id, companyName: selectedCompany.name, contactId: contact.id, contactName: contact.name, contactPhone: contact.phone ?? undefined, contactEmail: contact.email ?? undefined });
  };

  const handleClear = () => { setSelectedCompany(null); setSearch(""); onSelect(null); };
  if (selection?.companyId && selectedCompany) {
    return <SelectedCompanyView company={selectedCompany} contacts={contacts} loading={loadingContacts} selectedContactId={selection.contactId} onClear={handleClear} onSelectContact={handleSelectContact} />;
  }

  // Search mode
  return <CompanySearch search={search} debouncedSearch={debouncedSearch} showDropdown={showDropdown} companies={companies} loading={loadingCompanies} containerRef={ref} setSearch={setSearch} setShowDropdown={setShowDropdown} onSelect={handleSelectCompany} />;
}
