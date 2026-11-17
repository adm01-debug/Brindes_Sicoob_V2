import { useRef } from 'react';

/**
 * Preserva o último snapshot carregado enquanto a consulta é refeita ou falha,
 * evitando que uma atualização malsucedida apague KPIs, rankings e gráficos.
 * O snapshot só é reaproveitado na mesma chave (janela e escopo): trocar o
 * período muda os cortes temporais e reaproveitar eventos antigos distorceria
 * as comparações.
 */
export function usePreservedSnapshot<T>(key: string, data: T | undefined): T | undefined {
  const last = useRef<{ key: string; data: T } | undefined>(undefined);
  if (data !== undefined) last.current = { key, data };
  if (data !== undefined) return data;
  return last.current?.key === key ? last.current.data : undefined;
}
