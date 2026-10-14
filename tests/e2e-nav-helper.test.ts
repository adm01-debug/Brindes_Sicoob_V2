import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import { gotoAndSettle, waitForRouteIdle } from '../e2e/helpers/nav';

function createPage(goto: Page['goto']): Page {
  const waitFor = vi.fn().mockResolvedValue(undefined);
  return {
    goto,
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue({ first: () => ({ waitFor }) }),
    getByTestId: vi.fn().mockReturnValue({ isVisible: vi.fn().mockResolvedValue(false) }),
    addStyleTag: vi.fn().mockResolvedValue(undefined),
  } as unknown as Page;
}

describe('gotoAndSettle', () => {
  it('repete uma navegação interrompida por reload concorrente', async () => {
    const goto = vi
      .fn<Page['goto']>()
      .mockRejectedValueOnce(new Error('page.goto: Frame load interrupted'))
      .mockResolvedValueOnce(null);

    await expect(gotoAndSettle(createPage(goto), '/admin/usuarios')).resolves.toBeNull();

    expect(goto).toHaveBeenCalledTimes(2);
    expect(goto).toHaveBeenLastCalledWith('/admin/usuarios', {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
  });

  it('propaga erros determinísticos sem repetir a navegação', async () => {
    const error = new Error('page.goto: Timeout 20000ms exceeded');
    const goto = vi.fn<Page['goto']>().mockRejectedValue(error);

    await expect(gotoAndSettle(createPage(goto), '/admin/usuarios')).rejects.toBe(error);
    expect(goto).toHaveBeenCalledTimes(1);
  });
});

describe('waitForRouteIdle', () => {
  it('não espera permissões durante um desafio MFA', async () => {
    const page = createPage(vi.fn<Page['goto']>());

    await waitForRouteIdle(page, { waitForPermissions: false });

    expect(page.locator).toHaveBeenCalledWith('[data-route-pending="lazy"]');
  });

  it('aguarda todos os marcadores nas jornadas sem MFA', async () => {
    const page = createPage(vi.fn<Page['goto']>());

    await waitForRouteIdle(page);

    expect(page.locator).toHaveBeenCalledWith('[data-route-pending]');
  });
});
