/** Mantém reproduções de defeitos fora da suíte normal de aprovação do produto. */
import { defineConfig, mergeConfig } from 'vitest/config';
import configBase from '../../vitest.config';

export default mergeConfig(configBase, defineConfig({
  test: {
    include: [
      'scripts/revisao/pendencias-2026-09-12.cenarios.tsx',
      'tests/hooks/useKitAutoSave.test.tsx',
      'tests/hooks/useKitStockValidation.test.tsx',
      'tests/hooks/useSearch.test.ts',
      'tests/functions/catalog-redaction.test.ts',
      'tests/services/sicoobOrderService.test.ts',
      'tests/services/sicoobApprovalService.test.ts',
      'tests/services/sicoobFulfillmentService.test.ts',
      'tests/services/quoteVersionService.test.ts',
      'tests/utils/campaignExport.test.ts',
    ],
  },
}));
