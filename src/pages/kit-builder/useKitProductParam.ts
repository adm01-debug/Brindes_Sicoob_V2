import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { CompatibilityResult, ExternalProductForKit, KitItem } from '@/lib/kit-builder';
import { invokeExternalDb } from '@/lib/external-db';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import { logger } from '@/lib/logger';

type AddKitItem = (item: KitItem) => CompatibilityResult;

interface UseKitProductParamOptions {
  productIdParam: string | null;
  kitIdParam: string | null;
  templateIdParam: string | null;
  addItem: AddKitItem;
  setKitName: (name: string) => void;
}

async function loadKitProduct(productId: string): Promise<ExternalProductForKit | undefined> {
  const result = await invokeExternalDb<ExternalProductForKit>({
    table: 'products',
    operation: 'select',
    filters: { id: productId },
    select: 'id, name, sku, sale_price, primary_image_url, weight_g, width_mm, height_mm, length_mm, width_cm, height_cm, length_cm, materials, is_kit, category_id',
    limit: 1,
  });
  return result.records?.[0];
}

function applyProductToKit({
  product,
  productId,
  addItem,
  setKitName,
  appliedProductIdRef,
}: {
  product: ExternalProductForKit;
  productId: string;
  addItem: AddKitItem;
  setKitName: (name: string) => void;
  appliedProductIdRef: { current: string | null };
}): void {
  const result = addItem(transformToKitItem(product));
  setKitName(product.name || '');
  if (!result.fits) return;

  // Evita converter cada rerender de addItem em mais uma unidade do produto.
  appliedProductIdRef.current = productId;
  toast.success(`"${product.name}" adicionado ao kit!`, {
    description: 'Selecione uma caixa e continue montando.',
  });
}

export function useKitProductParam({
  productIdParam,
  kitIdParam,
  templateIdParam,
  addItem,
  setKitName,
}: UseKitProductParamOptions): void {
  const generationRef = useRef(0);
  const currentProductIdRef = useRef(productIdParam);
  const appliedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentProductIdRef.current !== productIdParam) {
      currentProductIdRef.current = productIdParam;
      appliedProductIdRef.current = null;
    }

    if (!productIdParam || kitIdParam || templateIdParam || appliedProductIdRef.current === productIdParam) {
      return;
    }

    const generation = ++generationRef.current;
    void (async () => {
      try {
        const product = await loadKitProduct(productIdParam);
        if (generation !== generationRef.current) return;

        if (!product) {
          toast.error('Produto não encontrado no catálogo');
          return;
        }
        applyProductToKit({
          product,
          productId: productIdParam,
          addItem,
          setKitName,
          appliedProductIdRef,
        });
      } catch (error) {
        if (generation !== generationRef.current) return;
        logger.warn('[kit-builder] Failed to load product:', error);
        toast.error('Erro ao carregar produto');
      }
    })();

    return () => {
      generationRef.current += 1;
    };
  }, [productIdParam, kitIdParam, templateIdParam, addItem, setKitName]);
}
