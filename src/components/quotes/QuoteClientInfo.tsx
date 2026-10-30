/**
 * QuoteClientInfo — Client & contact info cards for QuoteViewPage
 */
import { Building2, CreditCard, Mail, MapPin, Phone, User, UserPlus } from "lucide-react";

interface QuoteClientInfoProps {
  clientCompany?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCnpj?: string;
}

function CompanyInfo({ clientCompany, clientName, clientCnpj }: Pick<QuoteClientInfoProps, "clientCompany" | "clientName" | "clientCnpj">) {
  if (!clientCompany && !clientName) return <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 print:hidden">
    <UserPlus className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium text-muted-foreground">Nenhum cliente vinculado</p>
      <p className="text-xs text-muted-foreground/70">Edite o orçamento para vincular um cliente</p></div></div>;
  const [companyName, cityState] = (clientCompany || "Não especificado").split(" | ");
  return <div className="space-y-1"><p className="text-foreground font-bold text-lg">{companyName}</p>
    {cityState && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span>{cityState}</span></div>}
    {clientCnpj && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><CreditCard className="h-3.5 w-3.5" /><span>CNPJ: {clientCnpj}</span></div>}
  </div>;
}

function ContactInfo({ clientName, clientEmail, clientPhone }: Pick<QuoteClientInfoProps, "clientName" | "clientEmail" | "clientPhone">) {
  if (!clientName) return <p className="text-sm text-muted-foreground italic">Nenhum contato vinculado</p>;
  return <div className="space-y-1.5"><p className="text-foreground font-medium">{clientName}</p>
    {clientEmail && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span>{clientEmail}</span></div>}
    {clientPhone && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span>{clientPhone}</span></div>}
  </div>;
}

export function QuoteClientInfo({ clientCompany, clientName, clientEmail, clientPhone, clientCnpj }: QuoteClientInfoProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Empresa</h3>
        </div>
        <CompanyInfo clientCompany={clientCompany} clientName={clientName} clientCnpj={clientCnpj} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contato</h3>
        </div>
        <ContactInfo clientName={clientName} clientEmail={clientEmail} clientPhone={clientPhone} />
      </div>
    </div>
  );
}
