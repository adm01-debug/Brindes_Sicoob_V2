/**
 * useSkuValidation — Validates SKU uniqueness against external DB
 */
import { useState, useEffect } from 'react';

export function useSkuValidation(currentSku: string, isEdit: boolean, originalSku?: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (!currentSku || currentSku.length < 2) { setStatus('idle'); return; }
    if (isEdit && currentSku === originalSku) { setStatus('valid'); return; }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const products = await fetchPromobrindProducts({ search: currentSku, limit: 5 });
        const dup = products.find((product) => product.sku?.toLowerCase() === currentSku.toLowerCase());
        if (dup) { setStatus('duplicate'); setDuplicateName(dup.name || ''); }
        else { setStatus('valid'); setDuplicateName(''); }
      } catch { setStatus('idle'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentSku, isEdit, originalSku]);

  return { status, duplicateName };
}
