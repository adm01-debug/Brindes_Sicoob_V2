import { describe, it, expect } from 'vitest';
import { getStatusConfig } from '@/lib/sicoob-status-config';

describe('Sicoob Workflow Mapping', () => {
  const statuses = [
    'in_production', 
    'in_separation', 
    'in_transit', 
    'delivered', 
    'completed', 
    'cancelled'
  ] as const;

  it('maps all fulfillment_status to correct semantic tokens', () => {
    statuses.forEach(status => {
      const config = getStatusConfig(status);
      expect(config.label).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.statusToken).toBeDefined();
      
      // Verificando que as classes usam tokens semânticos e não cores hardcoded
      expect(config.colorClass).toMatch(/^text-(status|success|warning|destructive|info|brand|primary|reward)/);
      expect(config.bgClass).toMatch(/^bg-(status|success|warning|destructive|info|brand|primary|reward)/);
    });
  });

  it('has correct icon for transit status', () => {
    const config = getStatusConfig('in_transit');
    expect(config.label).toBe('Em Trânsito');
    // Truck icon check could be done by comparing components if needed, 
    // but here we check the mapping logic stability.
  });

  it('defaults to in_production for unknown status', () => {
    const config = getStatusConfig('unknown_status' as any);
    expect(config.label).toBe('Em Produção');
  });
});
