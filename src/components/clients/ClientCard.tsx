/**
 * ClientCard — card de listagem de empresa/cliente CRM com design 10/10.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, ChevronRight, Hash, Phone, ExternalLink } from "lucide-react";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: CrmCompany;
  onClick?: () => void;
  className?: string;
}

export function ClientCard({ client, onClick, className }: ClientCardProps) {
  const name = getCompanyDisplayName(client);
  const location = [client.cidade, client.estado].filter(Boolean).join(" / ");

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 border border-muted-foreground/10 hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 cursor-pointer bg-card/60 backdrop-blur-sm",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        className
      )}
    >
      <CardContent className="p-5 flex items-center gap-5">
        {/* Avatar/Logo Section */}
        <div className="relative flex-shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border border-primary/20 group-hover:scale-105 transition-transform duration-500 shadow-inner">
            {client.logo_url ? (
              <img src={client.logo_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Building2 className="h-7 w-7 text-primary/70 group-hover:text-primary transition-colors duration-300" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background shadow-sm" title="Ativo" />
        </div>

        {/* Info Section */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors duration-300">
              {name}
            </h3>
            {client.is_customer && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20 font-bold">
                Cliente
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {location && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-primary/50" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {client.cnpj && (
              <div className="flex items-center gap-1.5 truncate">
                <Hash className="h-3.5 w-3.5 text-primary/50" />
                <span className="font-mono">{client.cnpj}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action/Chevron Section */}
        <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
