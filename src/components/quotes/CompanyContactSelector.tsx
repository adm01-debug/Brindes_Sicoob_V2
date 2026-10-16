/**
 * CompanyContactSelector — Orchestrator (refactored)
 * Sub-components in ./company-contact/
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, User, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  listQuoteDirectoryCompanies,
  listQuoteDirectoryContacts,
} from '@/lib/crm-db';
import { CompanySearchDropdown } from './company-contact/CompanySearchDropdown';
import { ContactDropdown, SingleContactDisplay } from './company-contact/ContactSelector';
import type { CompanyOption, ContactOption } from './company-contact/shared-types';

export interface SelectedCompanyInfo {
  id: string;
  name: string;
  cnpj?: string;
  ramo_atividade?: string;
}
export interface SelectedContactInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cargo?: string;
}

interface CompanyContactSelectorProps {
  companyId: string;
  contactId?: string;
  onCompanyChange: (companyId: string) => void;
  onContactChange?: (contactId: string) => void;
  onCompanyInfoChange?: (info: SelectedCompanyInfo | null) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}

async function fetchCompany(companyId: string): Promise<CompanyOption | null> {
  if (!companyId) return null;
  const companies = await listQuoteDirectoryCompanies({ companyId, limit: 1 });
  return companies[0] ?? null;
}

async function fetchContacts(companyId: string): Promise<ContactOption[]> {
  if (!companyId) return [];
  return listQuoteDirectoryContacts(companyId, 50);
}

function useCompanyContactData(companyId: string) {
  const companyQuery = useQuery<CompanyOption | null>({
    queryKey: ['quote-company-by-id', companyId],
    queryFn: () => fetchCompany(companyId),
    enabled: Boolean(companyId),
    staleTime: 10 * 60 * 1000,
  });
  const contactsQuery = useQuery<ContactOption[]>({
    queryKey: ['quote-company-contacts', companyId],
    queryFn: () => fetchContacts(companyId),
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000,
  });
  return {
    fetchedCompany: companyQuery.data,
    contacts: contactsQuery.data,
    loadingContacts: contactsQuery.isLoading,
    contactsError: contactsQuery.isError,
    retryContacts: contactsQuery.refetch,
  };
}

interface ContactFieldProps {
  companyId: string;
  contacts?: ContactOption[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  contactId?: string;
  onContactChange?: (contactId: string) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}

function ContactField({
  companyId,
  contacts,
  isLoading,
  hasError,
  onRetry,
  contactId,
  onContactChange,
  onContactInfoChange,
}: ContactFieldProps) {
  if (!companyId)
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground',
        )}
      >
        Selecione uma empresa primeiro
      </div>
    );
  if (isLoading)
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground',
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  if (hasError)
    return (
      <div className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
        <span className="text-destructive">Não foi possível carregar os contatos.</span>
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (!contacts?.length)
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground',
        )}
      >
        Nenhum contato cadastrado
      </div>
    );
  const contact = contacts[0];
  if (contacts.length === 1 && contact)
    return (
      <SingleContactDisplay
        contact={contact}
        contactId={contactId}
        onContactChange={onContactChange}
        onContactInfoChange={onContactInfoChange}
      />
    );
  return (
    <ContactDropdown
      contacts={contacts}
      contactId={contactId}
      onContactChange={onContactChange}
      onContactInfoChange={onContactInfoChange}
    />
  );
}

function selectedCompanyInfo(company: CompanyOption): SelectedCompanyInfo {
  return {
    id: company.id,
    name: company.name,
    cnpj: company.cnpj || undefined,
    ramo_atividade: company.ramo_atividade || undefined,
  };
}

export function CompanyContactSelector({
  companyId,
  contactId,
  onCompanyChange,
  onContactChange,
  onCompanyInfoChange,
  onContactInfoChange,
}: CompanyContactSelectorProps) {
  const { fetchedCompany, contacts, loadingContacts, contactsError, retryContacts } =
    useCompanyContactData(companyId);

  const selectedCompany = useMemo(() => fetchedCompany || null, [fetchedCompany]);

  const handleSelectCompany = (company: CompanyOption | null) => {
    const id = company?.id ?? '';
    onCompanyChange(id);
    onContactChange?.('');
    onContactInfoChange?.(null);
    onCompanyInfoChange?.(company ? selectedCompanyInfo(company) : null);
  };

  const handleClearCompany = () => {
    onCompanyChange('');
    onContactChange?.('');
    onCompanyInfoChange?.(null);
    onContactInfoChange?.(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </Label>
        <CompanySearchDropdown
          companyId={companyId}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
          onClearCompany={handleClearCompany}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Contato
        </Label>
        <ContactField
          companyId={companyId}
          contacts={contacts}
          isLoading={loadingContacts}
          hasError={contactsError}
          onRetry={() => void retryContacts()}
          contactId={contactId}
          onContactChange={onContactChange}
          onContactInfoChange={onContactInfoChange}
        />
      </div>
    </div>
  );
}
