/**
 * CompanyContactSelector — Orchestrator (refactored)
 * Sub-components in ./company-contact/
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, User, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fetchQuoteDirectoryCompanies, fetchQuoteDirectoryContacts } from "@/lib/crm-db";
import { CompanySearchDropdown } from "./company-contact/CompanySearchDropdown";
import { ContactDropdown, SingleContactDisplay } from "./company-contact/ContactSelector";
import type { CompanyOption, ContactOption } from "./company-contact/shared-types";

export interface SelectedCompanyInfo { id: string; name: string; cnpj?: string; ramo_atividade?: string; }
export interface SelectedContactInfo { id: string; name: string; email?: string; phone?: string; cargo?: string; }

interface CompanyContactSelectorProps {
  companyId: string;
  contactId?: string;
  onCompanyChange: (companyId: string) => void;
  onContactChange?: (contactId: string) => void;
  onCompanyInfoChange?: (info: SelectedCompanyInfo | null) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}

// Empresas e contatos passam pelo contrato fechado quote_directory, unico
// acesso ao bridge liberado para vendedor e agente. O Edge ja devolve o
// e-mail e o telefone principais de cada contato.
async function fetchCompany(companyId: string): Promise<CompanyOption | null> {
  if (!companyId) return null;
  const data = await fetchQuoteDirectoryCompanies({ companyId, limit: 1 });
  const company = data[0];
  if (!company) return null;
  return { id: company.id, name: company.name, razao_social: company.razao_social, nome_fantasia: company.nome_fantasia, ramo_atividade: company.ramo_atividade, cnpj: company.cnpj, logo_url: company.logo_url };
}

async function fetchContacts(companyId: string): Promise<ContactOption[]> {
  if (!companyId) return [];
  const contacts = await fetchQuoteDirectoryContacts(companyId, 50);
  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    cargo: contact.cargo,
    email: contact.email,
    phone: contact.phone,
  }));
}

function useCompanyContactData(companyId: string) {
  const companyQuery = useQuery<CompanyOption | null>({
    queryKey: ["quote-company-by-id", companyId], queryFn: () => fetchCompany(companyId), enabled: Boolean(companyId), staleTime: 10 * 60 * 1000,
  });
  const contactsQuery = useQuery<ContactOption[]>({
    queryKey: ["quote-company-contacts", companyId], queryFn: () => fetchContacts(companyId), enabled: Boolean(companyId), staleTime: 5 * 60 * 1000,
  });
  return { fetchedCompany: companyQuery.data, contacts: contactsQuery.data, loadingContacts: contactsQuery.isLoading };
}

interface ContactFieldProps {
  companyId: string;
  contacts?: ContactOption[];
  isLoading: boolean;
  contactId?: string;
  onContactChange?: (contactId: string) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}

function ContactField({ companyId, contacts, isLoading, contactId, onContactChange, onContactInfoChange }: ContactFieldProps) {
  if (!companyId) return <div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground")}>Selecione uma empresa primeiro</div>;
  if (isLoading) return <div className={cn("flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground")}><Loader2 className="h-4 w-4 animate-spin" />Carregando...</div>;
  if (!contacts?.length) return <div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground")}>Nenhum contato cadastrado</div>;
  const contact = contacts[0];
  if (contacts.length === 1 && contact) return <SingleContactDisplay contact={contact} contactId={contactId} onContactChange={onContactChange} onContactInfoChange={onContactInfoChange} />;
  return <ContactDropdown contacts={contacts} contactId={contactId} onContactChange={onContactChange} onContactInfoChange={onContactInfoChange} />;
}

function selectedCompanyInfo(id: string, company: CompanyOption | null | undefined): SelectedCompanyInfo | null | undefined {
  if (!id) return null;
  if (company?.id !== id) return undefined;
  return { id: company.id, name: company.name, cnpj: company.cnpj || undefined, ramo_atividade: company.ramo_atividade || undefined };
}

export function CompanyContactSelector({
  companyId, contactId, onCompanyChange, onContactChange, onCompanyInfoChange, onContactInfoChange,
}: CompanyContactSelectorProps) {
  const { fetchedCompany, contacts, loadingContacts } = useCompanyContactData(companyId);

  const selectedCompany = useMemo(() => fetchedCompany || null, [fetchedCompany]);

  const handleSelectCompany = (id: string) => {
    onCompanyChange(id);
    onContactChange?.("");
    onContactInfoChange?.(null);
    const companyInfo = selectedCompanyInfo(id, fetchedCompany);
    if (companyInfo !== undefined) onCompanyInfoChange?.(companyInfo);
  };

  const handleClearCompany = () => {
    onCompanyChange(""); onContactChange?.(""); onCompanyInfoChange?.(null); onContactInfoChange?.(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" />Empresa</Label>
        <CompanySearchDropdown companyId={companyId} selectedCompany={selectedCompany} onSelectCompany={handleSelectCompany} onClearCompany={handleClearCompany} />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><User className="h-4 w-4" />Contato</Label>
        <ContactField companyId={companyId} contacts={contacts} isLoading={loadingContacts} contactId={contactId} onContactChange={onContactChange} onContactInfoChange={onContactInfoChange} />
      </div>
    </div>
  );
}
