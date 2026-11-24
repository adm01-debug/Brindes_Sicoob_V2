export interface TextoDaSaida {
  mensagem: string;
  rotulo: string;
  /** A confirmação grava o que está na tela? `false` = ela descarta. */
  grava: boolean;
}

/**
 * O aviso de saída tem que dizer o que a saída faz de verdade.
 *
 * Num kit pessoal o autosave continua depois da navegação: prometer que "sair
 * descarta" era falso, e quem confirmasse via o trabalho gravado do mesmo
 * jeito. Quem realmente perde trabalho é a edição de template (sem autosave) e
 * o kit cujo salvamento falhou ou bateu em conflito. Nesses casos a
 * confirmação não pode tentar gravar de novo: o conflito não se resolve
 * repetindo a gravação e a troca de tela ficaria presa.
 */
export function textoDaSaida(
  templateSemAutosave: boolean, erroDeSalvamento: string | null, conflito: boolean,
): TextoDaSaida {
  if (erroDeSalvamento || conflito) return {
    mensagem: 'Este kit ainda não foi salvo. Sair agora pode descartar as últimas alterações.',
    rotulo: 'Sair sem salvar',
    grava: false,
  };
  if (templateSemAutosave) return {
    mensagem: 'As alterações no template ainda não foram salvas. Sair agora as descarta.',
    rotulo: 'Sair sem salvar',
    grava: false,
  };
  return {
    mensagem: 'A gravação automática continua ao sair: o seu kit será gravado.',
    rotulo: 'Sair e gravar',
    grava: true,
  };
}
