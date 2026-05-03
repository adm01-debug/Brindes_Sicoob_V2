import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const sectionMap: Record<string, string> = {
  "/": "Catálogo",
  "/produtos": "Catálogo",
  "/filtros": "Super Filtro",
  "/novidades": "Novidades",
  "/colecoes": "Coleções",
  "/estoque": "Estoque",
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/simulador": "Simulador",
  "/simulador-precos": "Preços por Tiragem",
  "/mockup-generator": "Mockups",
  "/magic-up": "Magic Up",
  "/favoritos": "Favoritos",
  "/comparar": "Comparar",
  
  "/configuracoes": "Configurações",
  "/admin": "Administração",
  "/admin/temas": "Skins",
  "/seguranca": "Segurança",

  // SICOOB Section
  "/sicoob": "Portal SICOOB",
  "/pa": "Portal PA",
  "/gestor": "Gestão Singular",
  "/vendedor": "Carteira Vendedor",
  "/dashboard-pa": "Portal PA",
  "/relatorios/sicoob": "Relatórios SICOOB",
  "/kpis/sicoob": "Analytics SICOOB",
};

export function useCurrentSection(): string {
  const { pathname } = useLocation();

  return useMemo(() => {
    // Try exact match first
    if (sectionMap[pathname]) return sectionMap[pathname];

    // Try progressively shorter prefixes
    const parts = pathname.split("/").filter(Boolean);
    while (parts.length > 0) {
      const prefix = "/" + parts.join("/");
      if (sectionMap[prefix]) return sectionMap[prefix];
      parts.pop();
    }

    return "Início";
  }, [pathname]);
}
