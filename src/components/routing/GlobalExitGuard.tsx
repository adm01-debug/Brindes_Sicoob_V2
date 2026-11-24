import { useEffect, useRef } from 'react';
import { useBlocker, useLocation } from 'react-router-dom';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import {
  autorizarSaida,
  descartarAcoesAposSaida,
  descartarTrabalhoDaRota,
  executarAcoesAposSaida,
  limparAutorizacaoDeSaida,
  mensagemDaRota,
  rotaEstaSuja,
  rotaTemEstadoDeclarado,
  rotuloDaRota,
  saidaAutorizada,
} from '@/lib/navigation/dirty-registry';
import { trackUx } from '@/lib/uxMetrics';

/**
 * O aviso de saída que vale para o portal inteiro.
 *
 * O registro (`dirty-registry`) já sabia quem tem trabalho pendente, mas quem o
 * consultava era só o voltar (`useSmartNavigation`). Menu, cartão e atalho
 * chamam `navigate` direto e passavam por cima — o formulário preenchido ia
 * embora no primeiro clique fora da tela. Aqui a navegação interna ganha um
 * portão único, que o data router sabe segurar antes de trocar a URL.
 *
 * Rota que não declarou estado continua sem aviso: mesma política do registro,
 * para nenhuma tela mudar de comportamento por esquecimento de cadastro.
 */
export function GlobalExitGuard() {
  const location = useLocation();

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname === nextLocation.pathname
      && currentLocation.search === nextLocation.search) {
      return false;
    }
    // Quem já respondeu nesta tela navega sem ser perguntado de novo.
    if (saidaAutorizada()) return false;
    return rotaTemEstadoDeclarado(currentLocation.pathname)
      && rotaEstaSuja(currentLocation.pathname);
  });

  const bloqueado = blocker.state === 'blocked';

  useEffect(() => {
    if (bloqueado) trackUx('guard.shown');
  }, [bloqueado]);

  // A autorização vale para uma navegação; trocou a rota, ela caducou.
  useEffect(() => {
    limparAutorizacaoDeSaida();
  }, [location.key]);

  // `blocker.state` é o valor do render em que o diálogo foi montado, então ele
  // continua "blocked" logo depois do `proceed()`; o fechamento automático do
  // diálogo (Radix) chamaria a resposta contrária na mesma batida. Esta trava
  // garante uma resposta por bloqueio.
  const respostaDada = useRef(false);
  useEffect(() => {
    if (!bloqueado) respostaDada.current = false;
  }, [bloqueado]);

  // O diálogo fecha sozinho depois de uma resposta, e fechar também cai aqui:
  // sem esta trava, o "Sair sem salvar" viraria um cancelamento em seguida e a
  // mesma saída seria contada duas vezes.
  const decidir = (resposta: 'sair' | 'ficar') => {
    if (blocker.state !== 'blocked' || respostaDada.current) return;
    respostaDada.current = true;
    trackUx(resposta === 'sair' ? 'guard.confirm' : 'guard.cancel');
    if (resposta === 'sair') {
      // O voltar do navegador (POP) e repetido pelo roteador depois do
      // `proceed`: sem a autorizacao, a repeticao cairia no mesmo predicado e
      // o aviso reapareceria em cima da propria confirmacao.
      autorizarSaida();
      // Antes do `proceed`: a tela desmonta e leva o registro da rota junto.
      descartarTrabalhoDaRota(location.pathname);
      blocker.proceed();
      // Efeito colateral da saida (apagar o carrinho do cabecalho, por
      // exemplo) so vale quando a saida acontece de fato.
      executarAcoesAposSaida();
      return;
    }
    descartarAcoesAposSaida();
    blocker.reset();
  };

  return (
    <UnsavedChangesDialog
      open={bloqueado}
      message={mensagemDaRota(location.pathname) ?? undefined}
      confirmLabel={rotuloDaRota(location.pathname) ?? 'Sair sem salvar'}
      onConfirm={() => decidir('sair')}
      onCancel={() => decidir('ficar')}
    />
  );
}
