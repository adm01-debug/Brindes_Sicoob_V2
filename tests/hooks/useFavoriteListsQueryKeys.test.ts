import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { favoriteItemsQueryKey, favoriteListsQueryKey } from '@/hooks/useFavoriteLists';

describe('isolamento multiusuário dos favoritos remotos', () => {
  it('não entrega listas ou itens em cache de uma sessão para a conta seguinte', () => {
    const client = new QueryClient();
    client.setQueryData(favoriteListsQueryKey('usuario-1'), [{ id: 'lista-secreta' }]);
    client.setQueryData(favoriteItemsQueryKey('usuario-1', 'lista-secreta'), [{ id: 'item-secreto' }]);

    expect(client.getQueryData(favoriteListsQueryKey('usuario-2'))).toBeUndefined();
    expect(client.getQueryData(favoriteItemsQueryKey('usuario-2', 'lista-secreta'))).toBeUndefined();
  });
});
