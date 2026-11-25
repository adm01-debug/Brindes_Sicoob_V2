import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const usarKits = vi.fn();
vi.mock('@/hooks/useSimilarKits', () => ({
  useSimilarKits: (args: unknown) => usarKits(args),
}));

import { SimilarKitsWidget } from '@/components/kit-builder/SimilarKitsWidget';

const item = {
  template: {
    id: 'tpl-natal', name: 'Natal Cooperado', icon: 'Gift', color: '#00AE9D',
    tag: 'Fim de ano', total_price: 120,
  },
  ratio: 0.5,
  overlap: 3,
};

describe('SimilarKitsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usarKits.mockReturnValue({ data: [item], isLoading: false });
  });

  it('entrega o template escolhido para a pagina decidir a troca', async () => {
    // A pagina sabe se ha edicao pendente: o widget nao pode navegar sozinho,
    // senao a troca de template descarta o que o vendedor editou.
    const onSelectTemplate = vi.fn();
    render(
      <MemoryRouter initialEntries={['/montar-kit']}>
        <SimilarKitsWidget currentSkus={['SKU-1']} onSelectTemplate={onSelectTemplate} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Natal Cooperado'));

    expect(onSelectTemplate).toHaveBeenCalledWith('tpl-natal');
    expect(screen.getByText('Natal Cooperado')).toBeInTheDocument();
  });

  it('sem a pagina, cai na navegacao direta para o template', async () => {
    function SondaDeRota() {
      const { pathname, search } = useLocation();
      return <p data-testid="rota">{pathname + search}</p>;
    }

    render(
      <MemoryRouter initialEntries={['/montar-kit']}>
        <SimilarKitsWidget currentSkus={['SKU-1']} />
        <SondaDeRota />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Natal Cooperado'));

    expect(screen.getByTestId('rota')).toHaveTextContent('/montar-kit?template=tpl-natal');
  });

  it('fica oculto quando o kit ainda nao tem SKU', () => {
    const { container } = render(
      <MemoryRouter><SimilarKitsWidget currentSkus={[]} /></MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
