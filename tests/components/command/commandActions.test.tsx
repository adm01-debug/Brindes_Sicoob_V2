import { describe, expect, it, vi } from 'vitest';
import { buildActions } from '@/components/command/commandActions';

function buildTestActions() {
  return buildActions({
    goTo: vi.fn(),
    actualTheme: 'light',
    setTheme: vi.fn(),
    setOpen: vi.fn(),
  });
}

describe('ações da barra global', () => {
  it('associa todas as navegações a rotas válidas para o filtro de permissão', () => {
    const actions = buildTestActions();
    const navigations = actions.filter((action) => action.category === 'navigation');

    expect(navigations.every((action) => Boolean(action.path))).toBe(true);
    const paths = navigations.map((action) => action.path);
    for (const stalePath of ['/tecnicas', '/datas-comemorativas', '/relatorios']) {
      expect(paths).not.toContain(stalePath);
    }
  });

  it('direciona ajuda, relatórios e configurações para as rotas canônicas', () => {
    const actions = buildTestActions();

    expect(actions.find((action) => action.id === 'help')?.path).toBe('/ajuda');
    expect(actions.find((action) => action.id === 'shortcuts')?.path).toBe('/ajuda');
    expect(actions.find((action) => action.id === 'reports')?.path).toBe('/relatorios/sicoob');
    expect(actions.find((action) => action.id === 'settings')?.path).toBe('/admin/temas');
  });

  it('abre a impressão do navegador ao salvar a página como PDF', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const actions = buildTestActions();

    actions.find((action) => action.id === 'export-pdf')?.action();

    expect(print).toHaveBeenCalledOnce();
  });
});
