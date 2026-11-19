/**
 * O voltar pedia confirmação por pathname: em /simulador, /orcamentos/novo e
 * /mockup-generator ele afirmava "Você tem alterações não salvas nesta tela"
 * a cada clique, com a tela em branco inclusive. Interrogar sem motivo ensina
 * o usuário a confirmar sem ler.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  declararEstadoDaRota,
  esquecerRota,
  limparRegistroDeRotas,
  rotaEstaSuja,
  rotaTemEstadoDeclarado,
} from '@/lib/navigation/dirty-registry';

describe('registro de trabalho não salvo por rota', () => {
  beforeEach(() => limparRegistroDeRotas());

  it('rota que nao declarou nada continua sem estado — a regra antiga vale', () => {
    expect(rotaTemEstadoDeclarado('/simulador')).toBe(false);
    expect(rotaEstaSuja('/simulador')).toBe(false);
  });

  it('tela limpa declara que nao ha o que perder', () => {
    declararEstadoDaRota('/orcamentos/novo', false);
    expect(rotaTemEstadoDeclarado('/orcamentos/novo')).toBe(true);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(false);
  });

  it('tela com trabalho pendente declara sujo', () => {
    declararEstadoDaRota('/orcamentos/novo', true);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(true);
  });

  it('ao desmontar, a rota volta a nao ter estado declarado', () => {
    declararEstadoDaRota('/orcamentos/novo', true);
    esquecerRota('/orcamentos/novo');
    expect(rotaTemEstadoDeclarado('/orcamentos/novo')).toBe(false);
    // Importante: sem estado declarado, quem decide volta a ser a lista de
    // rotas críticas — nunca o silêncio.
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(false);
  });

  it('rotas sao independentes entre si', () => {
    declararEstadoDaRota('/orcamentos/novo', true);
    declararEstadoDaRota('/montar-kit', false);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(true);
    expect(rotaEstaSuja('/montar-kit')).toBe(false);
  });
});
