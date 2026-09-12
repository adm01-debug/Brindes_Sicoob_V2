import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const state = vi.hoisted(() => ({
  userId: 'u1',
  memberResponses: new Map<string, Promise<any>>(),
  orgResponses: new Map<string, Promise<any>>(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => table === 'organization_members'
      ? { select: () => ({ eq: (_column: string, userId: string) => state.memberResponses.get(userId) }) }
      : { select: () => ({ in: (_column: string, ids: string[]) => ({ eq: () => state.orgResponses.get(ids.join(',')) }) }) },
    rpc: vi.fn(),
  },
}));

import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';

function Probe() {
  const { currentOrg, currentRole, organizations, isLoading } = useOrganization();
  return <div data-testid="org-state">{isLoading ? 'loading' : `${currentOrg?.id || 'none'}|${currentRole || 'none'}|${organizations.length}`}</div>;
}

describe('OrganizationProvider — concorrência e falha fechada', () => {
  beforeEach(() => {
    state.userId = 'u1';
    state.memberResponses.clear();
    state.orgResponses.clear();
    localStorage.clear();
    useRecentlyViewedStore.getState().reset();
  });

  it('descarta a resposta antiga quando a sessão muda e mantém organização/papel coerentes', async () => {
    const oldMembers = deferred<any>();
    state.memberResponses.set('u1', oldMembers.promise);
    state.memberResponses.set('u2', Promise.resolve({
      data: [{ organization_id: 'org-b', role: 'admin' }], error: null,
    }));
    state.orgResponses.set('org-a', Promise.resolve({
      data: [{ id: 'org-a', name: 'A', is_active: true }], error: null,
    }));
    state.orgResponses.set('org-b', Promise.resolve({
      data: [{ id: 'org-b', name: 'B', is_active: true }], error: null,
    }));

    const view = render(<OrganizationProvider><Probe /></OrganizationProvider>);
    state.userId = 'u2';
    view.rerender(<OrganizationProvider><Probe /></OrganizationProvider>);

    await waitFor(() => expect(screen.getByTestId('org-state')).toHaveTextContent('org-b|admin|1'));
    oldMembers.resolve({ data: [{ organization_id: 'org-a', role: 'owner' }], error: null });
    await Promise.resolve();

    expect(screen.getByTestId('org-state')).toHaveTextContent('org-b|admin|1');
    expect(useRecentlyViewedStore.getState().scopeKey).toBe('user:u2:org:org-b');
  });

  it('remove o contexto anterior quando a leitura de vínculos falha', async () => {
    state.memberResponses.set('u1', Promise.resolve({
      data: [{ organization_id: 'org-a', role: 'owner' }], error: null,
    }));
    state.orgResponses.set('org-a', Promise.resolve({
      data: [{ id: 'org-a', name: 'A', is_active: true }], error: null,
    }));
    const view = render(<OrganizationProvider><Probe /></OrganizationProvider>);
    await waitFor(() => expect(screen.getByTestId('org-state')).toHaveTextContent('org-a|owner|1'));

    state.userId = 'u3';
    state.memberResponses.set('u3', Promise.resolve({ data: null, error: new Error('vínculo revogado') }));
    view.rerender(<OrganizationProvider><Probe /></OrganizationProvider>);

    await waitFor(() => expect(screen.getByTestId('org-state')).toHaveTextContent('none|none|0'));
    expect(useRecentlyViewedStore.getState().scopeKey).toBe('user:u3');
  });
});
