import { describe, expect, it } from 'vitest';
import { textoDaSaida } from '@/lib/kit-builder/saida-da-tela';

describe('textoDaSaida', () => {
  it('promete gravar quando o autosave cobre a saida', () => {
    const saida = textoDaSaida(false, null, false);
    expect(saida.rotulo).toBe('Sair e gravar');
    expect(saida.grava).toBe(true);
  });

  it('avisa descarte quando a gravacao falhou', () => {
    const saida = textoDaSaida(false, 'banco indisponível', false);
    expect(saida.rotulo).toBe('Sair sem salvar');
    expect(saida.grava).toBe(false);
    expect(saida.mensagem).toContain('não foi salvo');
  });

  it('avisa descarte no conflito com outra aba e nao tenta gravar de novo', () => {
    // Repetir a gravacao num conflito cai no mesmo conflito e prende a troca
    // de tela: a confirmacao do conflito descarta de proposito.
    const saida = textoDaSaida(false, null, true);
    expect(saida.rotulo).toBe('Sair sem salvar');
    expect(saida.grava).toBe(false);
  });

  it('avisa descarte na edicao de template, que nao tem autosave', () => {
    const saida = textoDaSaida(true, null, false);
    expect(saida.rotulo).toBe('Sair sem salvar');
    expect(saida.grava).toBe(false);
    expect(saida.mensagem).toContain('template');
  });
});
