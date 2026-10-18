import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync('src/routes/config/sicoob-rbac.ts', 'utf8');
const access = readFileSync('src/lib/access/role-policy.ts', 'utf8');
const sidebar = readFileSync('src/components/layout/SidebarReorganized.tsx', 'utf8');
const page = readFileSync('src/pages/sicoob/GestorDelegationsPage.tsx', 'utf8');

test('titulares acessam delegações fora do módulo administrativo', () => {
  assert.match(routes, /path: "\/gestor\/delegacoes"/);
  assert.match(access, /'\/gestor\/delegacoes': MANAGERS/);
  assert.match(sidebar, /href: '\/gestor\/delegacoes'/);
  assert.match(page, /<ApprovalDelegationsTab \/>/);
});
