/**
 * O voltar pedia confirmação por pathname: em /simulador, /orcamentos/novo e
 * /mockup-generator ele afirmava "Você tem alterações não salvas nesta tela"
 * a cada clique, com a tela em branco inclusive. Interrogar sem motivo ensina
 * o usuário a confirmar sem ler.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  agendarAposSaida,
  autorizarSaida,
  declararEstadoDaRota,
  descartarAcoesAposSaida,
  esquecerRota,
  executarAcoesAposSaida,
  limparAutorizacaoDeSaida,
  limparRegistroDeRotas,
  rotaEstaSuja,
  rotaTemEstadoDeclarado,
  rotuloDaRota,
  saidaAutorizada,
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

describe('autorização de saída de quem já perguntou', () => {
  beforeEach(() => limparRegistroDeRotas());

  it('sem confirmação recente, o portão não está autorizado', () => {
    expect(saidaAutorizada()).toBe(false);
  });

  it('quem confirmou autoriza a saída que vem logo abaixo', () => {
    const agora = Date.now();
    autorizarSaida();
    expect(saidaAutorizada(agora + 10)).toBe(true);
  });

  it('autorização velha não libera a próxima saída — o usuário pode ter mudado de ideia', () => {
    const agora = Date.now();
    autorizarSaida();
    expect(saidaAutorizada(agora + 60_000)).toBe(false);
  });

  it('o logout apaga a autorização junto com o registro', () => {
    autorizarSaida();
    limparRegistroDeRotas();
    expect(saidaAutorizada()).toBe(false);
  });

  it('limpar só a autorização preserva quem está sujo', () => {
    declararEstadoDaRota('/montar-kit', true);
    autorizarSaida();
    limparAutorizacaoDeSaida();
    expect(saidaAutorizada()).toBe(false);
    expect(rotaEstaSuja('/montar-kit')).toBe(true);
  });
});

describe('rótulo do botão de saída', () => {
  beforeEach(() => limparRegistroDeRotas());

  it('rota sem rótulo devolve null — o portão usa o texto padrão', () => {
    declararEstadoDaRota('/orcamentos/novo', true, 'Orçamento não salvo.');
    expect(rotuloDaRota('/orcamentos/novo')).toBeNull();
  });

  it('a tela que grava ao sair diz isso no botão', () => {
    declararEstadoDaRota('/montar-kit', true, 'A gravação continua.', 'Sair e gravar');
    expect(rotuloDaRota('/montar-kit')).toBe('Sair e gravar');
  });
});

describe('ações que só valem depois da saída confirmada', () => {
  beforeEach(() => limparRegistroDeRotas());

  it('executa uma única vez, na ordem em que foram agendadas', () => {
    const ordem: string[] = [];
    agendarAposSaida(() => ordem.push('primeira'));
    agendarAposSaida(() => ordem.push('segunda'));

    executarAcoesAposSaida();

    expect(ordem).toEqual(['primeira', 'segunda']);
    executarAcoesAposSaida();
    expect(ordem).toEqual(['primeira', 'segunda']);
  });

  it('descartar impede o efeito colateral de quem ficou na tela', () => {
    let apagou = false;
    agendarAposSaida(() => { apagou = true; });

    descartarAcoesAposSaida();
    executarAcoesAposSaida();

    expect(apagou).toBe(false);
  });

  it('o logout limpa a fila junto com o registro', () => {
    let apagou = false;
    agendarAposSaida(() => { apagou = true; });

    limparRegistroDeRotas();
    executarAcoesAposSaida();

    expect(apagou).toBe(false);
  });
});
