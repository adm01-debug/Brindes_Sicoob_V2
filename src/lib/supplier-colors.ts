/**
 * Sistema de cores por fornecedor
 * Cores específicas para badges de cada fornecedor
 */

export interface SupplierColorConfig {
  bg: string;
  text: string;
  border?: string;
  hex: string; // cor hex pura para estilos inline
}

// Mapeamento de cores por fornecedor (baseado em palavras-chave no nome)
const SUPPLIER_COLORS: Record<string, SupplierColorConfig> = {
  // XBZ - Azul Royal
  xbz: {
    bg: 'bg-[#4169E1]/15',
    text: 'text-[#4169E1]',
    border: 'border-[#4169E1]/30',
    hex: '#4169E1',
  },
  // SPOT / Stricker - Verde Tiffany
  spot: {
    bg: 'bg-[#0ABAB5]/15',
    text: 'text-[#0ABAB5]',
    border: 'border-[#0ABAB5]/30',
    hex: '#0ABAB5',
  },
  stricker: {
    bg: 'bg-[#0ABAB5]/15',
    text: 'text-[#0ABAB5]',
    border: 'border-[#0ABAB5]/30',
    hex: '#0ABAB5',
  },
  // Asia Import - Vermelho Vivo
  asia: {
    bg: 'bg-[#FF3B30]/15',
    text: 'text-[#FF3B30]',
    border: 'border-[#FF3B30]/30',
    hex: '#FF3B30',
  },
  // Fallback - Sicoob Amarelo (cor de destaque do sistema)
  default: {
    bg: 'bg-orange/15',
    text: 'text-orange',
    border: 'border-orange/30',
    hex: '#FFBB00',
  },
};

/**
 * Retorna as classes de cor para um fornecedor específico
 * @param supplierName Nome do fornecedor
 * @returns Configuração de cores do fornecedor
 */
export function getSupplierColors(supplierName: string): SupplierColorConfig {
  const nameLower = supplierName.toLowerCase();
  
  // Verifica cada palavra-chave
  if (nameLower.includes('xbz')) {
    return SUPPLIER_COLORS.xbz;
  }
  if (nameLower.includes('spot') || nameLower.includes('stricker')) {
    return SUPPLIER_COLORS.spot;
  }
  if (nameLower.includes('asia')) {
    return SUPPLIER_COLORS.asia;
  }
  
  // Retorna laranja como padrão
  return SUPPLIER_COLORS.default;
}

/**
 * Retorna as classes CSS combinadas para o badge do fornecedor
 * @param supplierName Nome do fornecedor
 * @returns String com classes Tailwind
 */
export function getSupplierBadgeClasses(supplierName: string): string {
  const colors = getSupplierColors(supplierName);
  return `${colors.bg} ${colors.text} ${colors.border || ''} border`;
}
