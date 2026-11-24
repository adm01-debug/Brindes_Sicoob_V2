import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';

/**
 * Mock encadeável do cliente Supabase.
 *
 * O autosave usa três caminhos: `update(...).eq()...select().maybeSingle()`,
 * `insert(...).select().single()` e, para a trava otimista,
 * `select('updated_at').eq()...maybeSingle()`. O construtor abaixo aceita
 * qualquer quantidade de `.eq()` e devolve o terminal certo.
 */
const maybeSingle = vi.fn();          // terminal do UPDATE
const leituraVersao = vi.fn();        // terminal do SELECT updated_at
const single = vi.fn();               // terminal do INSERT

function cadeia(terminal: ReturnType<typeof vi.fn>) {
  const no: Record<string, unknown> = {};
  no.eq = vi.fn(() => no);
  no.select = vi.fn(() => no);
  no.maybeSingle = terminal;
  no.single = terminal;
  return no;
}

const update = vi.fn((_payload: Record<string, unknown>) => cadeia(maybeSingle));

/** Valor que o n-esimo UPDATE usou na trava `.eq('updated_at', ...)`. */
function travaDoUpdate(n: number): unknown {
  const no = update.mock.results[n]?.value as { eq: { mock: { calls: unknown[][] } } };
  const chamada = no.eq.mock.calls.find((args) => args[0] === 'updated_at');
  return chamada?.[1];
}
const insert = vi.fn((_payload: Record<string, unknown>) => cadeia(single));
const selectTabela = vi.fn((_colunas: string) => cadeia(leituraVersao));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update, insert, select: selectTabela })) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { useKitAutoSave } from '@/hooks/useKitAutoSave';

const initialKit = {
  name: 'Kit', kitType: 'montado' as const,
  box: { id: 'caixa-1', name: 'Caixa', sku: 'CX-1', imageUrl: null, price: 0, internalWidth: 1, internalHeight: 1, internalDepth: 1, internalVolume: 1 },
  items: [],
  personalization: { box: { enabled: false }, items: {} }, totalItemsVolume: 0,
  availableVolume: 0, volumeUsagePercent: 0, totalWeight: 0, boxPrice: 0,
  itemsPrice: 0, personalizationPrice: 0, totalPrice: 0, isValid: false,
  validationErrors: [],
};

describe('useKitAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Sem versão conhecida: a primeira gravação segue sem trava, como quando o
    // kit acabou de ser criado nesta aba.
    leituraVersao.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => vi.useRealTimers());

  it('nao rebaixa para rascunho o kit que o montador considera valido', async () => {
    // O salvamento manual grava status 'ready' quando isValid; o automatico
    // fixava 'draft' e desfazia isso no proximo autosave — o selo do kit no
    // painel voltava para "Rascunho" sozinho.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });
    const kitValido = { ...initialKit, isValid: true };

    const { rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: kitValido } },
    );

    rerender({ kit: { ...kitValido, name: 'Kit renomeado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready' }));
  });

  it('grava a identidade escolhida no primeiro autosave de um kit novo', async () => {
    // Sem identidade no payload, a linha nascia com a cor e o icone padrao do
    // banco; e sem identidade no snapshot, trocar a cor nao disparava autosave.
    single.mockResolvedValue({ data: { id: 'kit-novo', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });
    const kitComIdentidade = {
      ...initialKit,
      identity: {
        color: '#00AE9D',
        icon: 'Gift',
        tag: 'Fim de ano',
        description: 'Kit de fim de ano da cooperativa',
        isFavorite: true,
      },
    };

    const { rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: kitComIdentidade });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      color: '#00AE9D',
      icon: 'Gift',
      tag: 'Fim de ano',
      description: 'Kit de fim de ano da cooperativa',
      is_favorite: true,
    }));
  });

  it('não confirma salvamento quando o Supabase retorna erro e permite nova tentativa', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('banco indisponível') });
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Kit atualizado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('banco indisponível');
    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => { result.current.retry(); await Promise.resolve(); });
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('trata zero linhas atualizadas como falha de permissão ou concorrência', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-inexistente'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Alteração sem persistência' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('não foi encontrado');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('serializa gravações concorrentes e persiste por último o estado mais recente', async () => {
    let resolveFirst: ((value: { data: { id: string; updated_at: string }; error: null }) => void) | undefined;
    maybeSingle.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Primeira alteração' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    rerender({ kit: { ...initialKit, name: 'Estado mais recente' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0]).toMatchObject({ name: 'Estado mais recente' });
    expect(result.current.lastSaveError).toBeNull();
  });

  it('preserva a edição enfileirada quando o pai adota o ID recém-criado', async () => {
    let resolveCreation: ((value: { data: { id: string; updated_at: string }; error: null }) => void) | undefined;
    single.mockImplementationOnce(() => new Promise(resolve => { resolveCreation = resolve; }));
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-criado', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => {
        const [kitId, setKitId] = useState<string>();
        return {
          kitId,
          autoSave: useKitAutoSave(kit, 1, kitId, setKitId),
        };
      },
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Estado inicial enviado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    rerender({ kit: { ...initialKit, name: 'Edição feita durante a criação' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreation?.({ data: { id: 'kit-criado', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.kitId).toBe('kit-criado');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Edição feita durante a criação' });
    expect(result.current.autoSave.lastSaveError).toBeNull();
  });
  it('abrir um kit salvo nao regrava no banco o que acabou de ler', async () => {
    // /montar-kit?kit=ID monta o hook com o ID ja definido e o kit ainda
    // vazio. Quando a leitura chega, o estado muda — mas isso e dado lido, nao
    // edicao. Antes do gate de hidratacao, o autosave gravava 5s depois:
    // updated_at mudava, "Meus kits" reordenava sozinho e abria janela para
    // sobrescrever o que outra aba tivesse gravado.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const { rerender } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );

    // chega o conteudo lido do banco
    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    rerender({ kit: kitCarregado, pronto: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    // a leitura terminou; ainda sem edicao do usuario
    rerender({ kit: kitCarregado, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();
  });

  it('conteudo lido e fim da hidratacao no mesmo render tambem nao regravam', async () => {
    // O React 18 agrupa o setState do conteudo lido e o da hidratacao: o hook
    // ve um unico render com `pronto: true` e o conteudo ja na tela. Com o
    // gate olhando so `!isReady`, esse render caia no caminho de edicao e
    // reagendava a gravacao do que acabara de ser lido.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1' }, error: null });

    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    const { rerender } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );

    rerender({ kit: kitCarregado, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    rerender({ kit: { ...kitCarregado, name: 'Agora sim o usuario editou' }, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('depois de carregado, a primeira edicao de verdade grava', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    const { rerender } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );
    rerender({ kit: kitCarregado, pronto: false });
    rerender({ kit: kitCarregado, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    rerender({ kit: { ...kitCarregado, name: 'Renomeado pelo usuario' }, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Renomeado pelo usuario' });
  });

  it('sair da tela durante o debounce grava o que estava pendente', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    const { rerender, unmount } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );
    rerender({ kit: kitCarregado, pronto: false });
    rerender({ kit: kitCarregado, pronto: true });

    // Edita e sai ANTES dos 5s do debounce — pela "Biblioteca", por exemplo.
    rerender({ kit: { ...kitCarregado, name: 'Editado e abandonado' }, pronto: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(update).not.toHaveBeenCalled();

    await act(async () => { unmount(); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Editado e abandonado' });
  });

  it('sair com tudo já gravado não dispara gravação nenhuma', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    const { rerender, unmount } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );
    rerender({ kit: kitCarregado, pronto: false });
    rerender({ kit: kitCarregado, pronto: true });

    await act(async () => { unmount(); });

    expect(update).not.toHaveBeenCalled();
  });

  it('sair depois do autosave concluido nao regrava o kit', async () => {
    // O timer ficava em `timerRef` depois de disparar. O desmonte lia essa
    // referencia velha como edicao pendente e gravava de novo: outro
    // `updated_at` sem mudanca de conteudo derrubava a versao conhecida por
    // outra aba e a proxima edicao dela virava conflito.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: '2026-11-18T11:00:00.000Z' }, error: null });

    const kitCarregado = { ...initialKit, name: 'Kit do banco', isValid: true };
    const { rerender, unmount } = renderHook(
      ({ kit, pronto }) => useKitAutoSave(kit, 1, 'kit-1', undefined, pronto),
      { initialProps: { kit: initialKit, pronto: false } },
    );
    rerender({ kit: kitCarregado, pronto: false });
    rerender({ kit: kitCarregado, pronto: true });

    rerender({ kit: { ...kitCarregado, name: 'Renomeado' }, pronto: true });
    // deixa o autosave concluir de verdade antes de sair
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });

    // sair sem editar de novo nao pode gerar um segundo UPDATE
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('kit novo (sem id na URL) continua salvando sozinho desde a primeira alteracao', async () => {
    single.mockResolvedValue({ data: { id: 'kit-novo', updated_at: '2026-11-18T10:00:00.000Z' }, error: null });

    const { rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Montado agora' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('edicao feita DEPOIS do clique em Salvar nao se perde', async () => {
    // A fila tambem pode conter alteracao MAIS NOVA que o conteudo enviado
    // pelo "Salvar". Invalidar a fila e dar a tela inteira como persistida
    // apagaria essa edicao sem nunca grava-la, com o indicador mostrando
    // sucesso.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'versao-D' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    // O usuario clica em Salvar com "Campanha A" na tela.
    rerender({ kit: { ...initialKit, name: 'Campanha A' } });
    const enviado = result.current.capturarSnapshotAtual();

    // Enquanto a requisicao manual nao volta, ele digita "Campanha B".
    rerender({ kit: { ...initialKit, name: 'Campanha B' } });

    // O manual confirma, informando o retrato que ele realmente mandou.
    act(() => { result.current.syncPersistedVersion('versao-B', enviado); });

    // B nao pode se perder: o reagendamento tem de grava-lo.
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Campanha B' });
  });

  it('autosave ja enfileirado nao grava por cima do salvamento manual', async () => {
    // O payload de cada gravacao e fotografado antes de entrar na fila e so le
    // a versao conhecida na hora de gravar. Sem invalidar a fila, a versao
    // adotada do salvamento manual liberaria uma gravacao velha a passar pela
    // trava e sobrescrever o que o "Salvar" acabou de confirmar.
    let liberaPrimeira: ((v: unknown) => void) | undefined;
    maybeSingle
      .mockImplementationOnce(() => new Promise((resolve) => { liberaPrimeira = resolve; }))
      .mockResolvedValue({ data: { id: 'kit-1', updated_at: 'versao-D' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Antigo' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    rerender({ kit: { ...initialKit, name: 'Intermediario' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    // o "Salvar" terminou e devolveu a versao B
    act(() => { result.current.syncPersistedVersion('versao-B'); });

    // a primeira gravacao da fila responde agora; a segunda nao pode gravar
    await act(async () => {
      liberaPrimeira?.({ data: null, error: null });
      // A primeira gravacao ainda percorre a releitura de versao antes de
      // liberar a fila; sem esvaziar a fila de microtarefas, a segunda nem
      // chegaria a tentar gravar e o teste passaria por acidente.
      for (let i = 0; i < 30; i += 1) await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Antigo' });
  });

  it('salvar manualmente e falhar nao apaga a edicao pendente do autosave', async () => {
    // flushPending cancela o timer agendado. Se ele ja marcasse o estado como
    // persistido, um "Salvar" que falhasse deixaria "tentar novamente" sem
    // nada para gravar: a edicao ficava so na tela.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'versao-B' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Edicao pendente' } });
    // o usuario clica em Salvar antes dos 5s
    await act(async () => { await result.current.flushPending(); });
    expect(update).not.toHaveBeenCalled();

    // o salvamento manual falhou: nada foi sincronizado. "Tentar novamente"
    // ainda tem o que gravar.
    act(() => { result.current.retry(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Edicao pendente' });
  });

  it('nao sobrescreve em silencio o kit que outra aba alterou', async () => {
    // Esta aba abriu a linha na versao A; outra aba gravou e a linha esta na B.
    // O UPDATE com trava nao casa nenhuma linha, e a releitura mostra que a
    // linha existe numa versao diferente: e conflito, nao falta de permissao.
    leituraVersao.mockResolvedValue({ data: { updated_at: 'versao-B' }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Alteracao desta aba' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('alterado em outro lugar');
    expect(result.current.lastSaveConflict).toBe(true);
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('linha ausente continua sendo falta de permissao, nao conflito', async () => {
    leituraVersao.mockResolvedValue({ data: null, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-sumido', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Alteracao' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('nao foi encontrado'.replace('nao', 'não'));
    expect(result.current.lastSaveConflict).toBe(false);
  });

  it('grava com a trava na versao que conhece e adota a versao devolvida', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'versao-B' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Primeira' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(result.current.lastSaveError).toBeNull();

    // Segunda gravacao: a versao conhecida veio da resposta anterior.
    rerender({ kit: { ...initialKit, name: 'Segunda' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(update).toHaveBeenCalledTimes(2);
    expect(travaDoUpdate(0)).toBe('versao-A');
    expect(travaDoUpdate(1)).toBe('versao-B');
    // Em nenhum momento a trava leu `updated_at` do banco para decidir o que
    // gravar: ler ali adotaria a versao de quem gravou no meio-tempo.
    expect(leituraVersao).not.toHaveBeenCalled();
  });

  it('a trava usa a versao do conteudo que esta na tela, nao a do banco na hora de gravar', async () => {
    // Outra aba gravou entre a leitura desta tela e o primeiro autosave daqui.
    // Com a leitura tardia, esta aba adotava a versao alheia e gravava por
    // cima o conteudo antigo da tela, sem conflito nenhum.
    leituraVersao.mockResolvedValue({ data: { updated_at: 'versao-da-outra-aba' }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-que-foi-para-a-tela'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Edicao desta aba' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveConflict).toBe(true);
  });

  it('salvar manualmente sincroniza a versao e o autosave seguinte nao vira conflito', async () => {
    // O "Salvar" grava na mesma linha e muda `updated_at`. Sem sincronizar, o
    // proximo autosave desta mesma aba era recusado como conflito e o kit
    // ficava travado ate recarregar a pagina.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'versao-C' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1', undefined, true, 'versao-A'),
      { initialProps: { kit: initialKit } },
    );

    // salvamento manual devolveu a versao B
    act(() => { result.current.syncPersistedVersion('versao-B'); });
    expect(result.current.lastSaveError).toBeNull();

    rerender({ kit: { ...initialKit, name: 'Edicao depois do salvar' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(travaDoUpdate(0)).toBe('versao-B');
    expect(result.current.lastSaveConflict).toBe(false);
    expect(result.current.lastSaveError).toBeNull();
  });

  it('flushPending espera o INSERT em voo e devolve o id criado', async () => {
    // O cenario do kit duplicado: o autosave esta criando o kit e o vendedor
    // clica em "Salvar". Sem esperar, o salvamento manual tambem faria INSERT
    // e sairiam dois kits iguais na lista.
    let resolverCriacao: ((value: { data: { id: string; updated_at: string }; error: null }) => void) | undefined;
    single.mockImplementationOnce(() => new Promise(resolve => { resolverCriacao = resolve; }));

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Kit novo' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    let idDevolvido: string | undefined = 'ainda-nao';
    await act(async () => {
      const espera = result.current.flushPending().then((id) => { idDevolvido = id; });
      resolverCriacao?.({ data: { id: 'kit-criado-pelo-autosave', updated_at: 'v1' }, error: null });
      await espera;
    });

    expect(idDevolvido).toBe('kit-criado-pelo-autosave');
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('flushPending cancela a gravacao agendada que o salvamento manual vai cobrir', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'v1' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Alteracao recem feita' } });
    // ainda dentro da janela de 5s: o timer existe e nao disparou
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(update).not.toHaveBeenCalled();

    await act(async () => { await result.current.flushPending(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });

    // o manual grava; o automatico nao duplica depois
    expect(update).not.toHaveBeenCalled();
  });

  it('nao grava em custom_kits enquanto edita um template do sistema', async () => {
    // `/montar-kit?template=ID` edita uma linha de `kit_templates`; quem grava
    // e o "Atualizar template". Com o autosave ligado, cada edicao criava um
    // kit pessoal paralelo com o conteudo do template.
    const { rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined, undefined, true, null, false),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal 2026 (editado)' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });

    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('marca alteracao pendente no modo template sem confundir leitura com edicao', async () => {
    const { result, rerender } = renderHook(
      ({ kit, pronto }: { kit: typeof initialKit; pronto: boolean }) =>
        useKitAutoSave(kit, 1, undefined, undefined, pronto, null, false),
      { initialProps: { kit: initialKit, pronto: false } },
    );

    // Conteudo chegando do banco: nao e edicao.
    rerender({ kit: { ...initialKit, name: 'Natal 2026' }, pronto: false });
    rerender({ kit: { ...initialKit, name: 'Natal 2026' }, pronto: true });
    expect(result.current.isDirty).toBe(false);

    rerender({ kit: { ...initialKit, name: 'Natal 2027' }, pronto: true });
    expect(result.current.isDirty).toBe(true);

    // `retry` nao pode voltar a gravar neste modo.
    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('sincronizar a versao nao reacorda o autosave no modo template', async () => {
    // "Atualizar template" grava `kit_templates` e depois avisa o autosave. Se
    // esse aviso reagendasse uma gravacao, voltaria a criar kit pessoal a
    // partir do template.
    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined, undefined, true, null, false),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal 2026 (editado)' } });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      result.current.syncPersistedVersion(null, result.current.capturarSnapshotAtual());
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.isDirty).toBe(false);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('desvincular o kit pessoal faz a proxima gravacao criar linha nova', async () => {
    // `/montar-kit?kit=ID&template=T` abre o kit pessoal ID e troca o conteudo
    // pelo template. Sem desvincular, o proximo autosave gravava o template
    // por cima do kit pessoal que o vendedor tinha aberto.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'v1' }, error: null });
    single.mockResolvedValue({ data: { id: 'kit-2', updated_at: 'v2' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Editado antes do template' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.current.autoSavedKitId).toBe('kit-1');

    act(() => { result.current.desvincularKitPessoal(); });
    expect(result.current.autoSavedKitId).toBeNull();
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.isDirty).toBe(false);

    rerender({ kit: { ...initialKit, name: 'Natal 2026 (template)' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1); // nao sobrescreveu o kit-1
  });

  it('resposta que chega depois da troca nao readota o kit anterior', async () => {
    // Trocar de template cancela o que ainda nao saiu, mas o INSERT ja enviado
    // ainda responde. Adotar esse id ligava a composicao do template ao kit
    // anterior, e a edicao seguinte gravava por cima dele.
    let liberarInsert: (valor: unknown) => void = () => undefined;
    single.mockImplementationOnce(() => new Promise((resolve) => { liberarInsert = resolve; }));
    const onCriado = vi.fn();

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined, onCriado),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    act(() => { result.current.desvincularKitPessoal(); });

    await act(async () => {
      liberarInsert({ data: { id: 'kit-natal', updated_at: 'v1' }, error: null });
      await Promise.resolve();
    });

    expect(onCriado).not.toHaveBeenCalled();
    expect(result.current.autoSavedKitId).toBeNull();

    single.mockResolvedValue({ data: { id: 'kit-boas-vindas', updated_at: 'v2' }, error: null });
    rerender({ kit: { ...initialKit, name: 'Boas-vindas' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
  });

  it('gravarPendente grava a composicao da tela antes da troca', async () => {
    // A troca de template nao desmonta a pagina: o flush de desmonte nao roda
    // e o aviso "Sair e gravar" ficaria mentindo.
    maybeSingle.mockResolvedValue({ data: { id: 'kit-1', updated_at: 'v2' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal 2026' } });
    expect(update).not.toHaveBeenCalled();

    let gravou = false;
    await act(async () => { gravou = await result.current.gravarPendente(); });

    expect(gravou).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Natal 2026' }));
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('gravarPendente nao repete a gravacao que ja esta em voo', async () => {
    // A troca de template durante o autosave enfileirava uma segunda gravacao
    // da mesma composicao e esperava as duas.
    let liberarInsert: (valor: unknown) => void = () => undefined;
    single.mockImplementationOnce(() => new Promise((resolve) => { liberarInsert = resolve; }));

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    let gravou = false;
    const pendente = result.current.gravarPendente().then((ok) => { gravou = ok; });
    await act(async () => {
      liberarInsert({ data: { id: 'kit-natal', updated_at: 'v1' }, error: null });
      await pendente;
    });

    expect(gravou).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('gravarPendente devolve false quando a gravacao falha', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error('sem permissao') });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Natal 2026' } });

    let gravou = true;
    await act(async () => { gravou = await result.current.gravarPendente(); });

    expect(gravou).toBe(false);
    expect(result.current.lastSaveError).toContain('sem permissao');
  });

  it('limpa a alteracao pendente quando o autosave conclui a gravacao', async () => {
    single.mockResolvedValue({ data: { id: 'kit-novo', updated_at: 'v1' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, undefined),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Kit alterado' } });
    expect(result.current.isDirty).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(result.current.isDirty).toBe(false);
  });
});
