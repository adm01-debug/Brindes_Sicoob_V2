/**
 * Recupera o contrato que vivia em `useNavigationGuardStore` (branch de
 * produção pré-re-raiz, PRs #308/#318 fechadas) sobre o registro que a main
 * tem: mensagem por escopo e limpeza total no logout.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  declararEstadoDaRota,
  esquecerRota,
  limparRegistroDeRotas,
  mensagemDaRota,
  rotaEstaSuja,
  rotaTemEstadoDeclarado,
} from '@/lib/navigation/dirty-registry';

describe('dirty-registry', () => {
  beforeEach(() => limparRegistroDeRotas());

  it('registra e remove rotas sujas', () => {
    declararEstadoDaRota('/orcamentos/novo', true, 'Mensagem do orçamento');

    expect(rotaTemEstadoDeclarado('/orcamentos/novo')).toBe(true);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(true);
    expect(mensagemDaRota('/orcamentos/novo')).toBe('Mensagem do orçamento');

    declararEstadoDaRota('/orcamentos/novo', false);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(false);
    expect(rotaTemEstadoDeclarado('/orcamentos/novo')).toBe(true);
  });

  it('rota sem mensagem própria devolve null, para o chamador usar o texto padrão', () => {
    declararEstadoDaRota('/simulador', true);
    expect(mensagemDaRota('/simulador')).toBeNull();
  });

  it('a mensagem é por rota e não vaza para outra', () => {
    declararEstadoDaRota('/orcamentos/novo', true, 'Orçamento em aberto');
    declararEstadoDaRota('/mockup-generator', true, 'Mockup sem salvar');

    expect(mensagemDaRota('/orcamentos/novo')).toBe('Orçamento em aberto');
    expect(mensagemDaRota('/mockup-generator')).toBe('Mockup sem salvar');
  });

  it('esquecer a rota devolve a decisão à regra antiga', () => {
    declararEstadoDaRota('/simulador', true, 'x');
    esquecerRota('/simulador');

    expect(rotaTemEstadoDeclarado('/simulador')).toBe(false);
    expect(mensagemDaRota('/simulador')).toBeNull();
  });

  it('limpar o registro invalida sujeira e mensagem — é o que o logout faz', () => {
    declararEstadoDaRota('/orcamentos/novo', true, 'Orçamento em aberto');
    declararEstadoDaRota('/simulador', true);

    limparRegistroDeRotas();

    expect(rotaTemEstadoDeclarado('/orcamentos/novo')).toBe(false);
    expect(rotaTemEstadoDeclarado('/simulador')).toBe(false);
    expect(rotaEstaSuja('/orcamentos/novo')).toBe(false);
  });
});
