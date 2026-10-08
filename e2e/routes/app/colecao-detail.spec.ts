import { buildAuthedRouteSuite } from '../_factories';
import { mockRestTable } from '../_shared';
import { SAMPLE_ID } from '../_catalog';

buildAuthedRouteSuite({
  name: '/colecoes/:id',
  path: `/colecoes/${SAMPLE_ID}`,
  primary: {
    kind: 'rest',
    key: 'collections',
    successBody: [
      {
        id: SAMPLE_ID,
        user_id: 'e2e-user-id',
        name: '[E2E] Coleção',
        icon: '📁',
        icon_color: '#003641',
        is_featured: false,
        created_at: '2026-01-01T12:00:00.000Z',
        updated_at: '2026-01-01T12:00:00.000Z',
      },
    ],
  },
  setupSuccessMocks: (page) => mockRestTable(page, 'collection_items', 200, []),
});
