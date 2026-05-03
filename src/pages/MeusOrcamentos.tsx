import { QuotesListPage } from "./QuotesListPage";
import { PageSEO } from "@/components/seo/PageSEO";

/**
 * MeusOrcamentos — View principal para Comprador PAC (Gerente PA).
 * Alias especializado para QuotesListPage.
 */
export default function MeusOrcamentos() {
  return (
    <>
      <PageSEO title="Meus Orçamentos" description="Gerencie suas solicitações de brinde." path="/meus-orcamentos" />
      <QuotesListPage />
    </>
  );
}
