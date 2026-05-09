import React from "react";
import { CompanyContactSelector } from "./CompanyContactSelector";

interface QuoteClientSelectorProps {
  clientId: string;
  contactId: string;
  onClientChange: (id: string) => void;
  onContactChange: (id: string) => void;
  onClientInfoChange?: (info: any) => void;
  onContactInfoChange?: (info: any) => void;
  className?: string;
}

/**
 * Componente unificado para seleção de cliente (empresa e contato) no módulo de orçamentos.
 */
export function QuoteClientSelector({
  clientId,
  contactId,
  onClientChange,
  onContactChange,
  onClientInfoChange,
  onContactInfoChange,
  className,
}: QuoteClientSelectorProps) {
  return (
    <div className={className}>
      <CompanyContactSelector
        companyId={clientId}
        contactId={contactId}
        onCompanyChange={onClientChange}
        onContactChange={onContactChange}
        onCompanyInfoChange={onClientInfoChange}
        onContactInfoChange={onContactInfoChange}
      />
    </div>
  );
}
