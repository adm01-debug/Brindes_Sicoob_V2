/**
 * Quem sabe se há trabalho não salvo é a tela, não a rota.
 *
 * O voltar do portal decidia pedir confirmação olhando só o pathname
 * (`isCriticalPathname`): em `/simulador`, `/orcamentos/novo` e
 * `/mockup-generator` ele afirmava "Você tem alterações não salvas nesta tela"
 * a cada clique, com a tela em branco inclusive. Interrogar sem motivo ensina o
 * usuário a confirmar sem ler — e aí a confirmação que importa também passa
 * batida.
 *
 * Este registro deixa a tela declarar o estado real. A troca é conservadora de
 * propósito: enquanto uma rota não declarar nada, o comportamento dela
 * continua exatamente o de hoje. Assim nenhuma tela passa a perder trabalho em
 * silêncio por esquecimento de registro — o risco que o inverso traria.
 */
interface EstadoDaRota {
  sujo: boolean;
  mensagem?: string;
  rotulo?: string;
}

const sujoPorRota = new Map<string, EstadoDaRota>();

/**
 * A tela assume a responsabilidade de dizer se tem trabalho pendente — e,
 * quando quiser, o que avisar. O texto genérico ("alterações não salvas") não
 * diz ao usuário o que ele perde; a tela sabe.
 */
export function declararEstadoDaRota(
  rota: string,
  sujo: boolean,
  mensagem?: string,
  rotulo?: string,
): void {
  sujoPorRota.set(rota, { sujo, mensagem, rotulo });
}

/** A tela saiu: volta a valer a regra antiga para essa rota. */
export function esquecerRota(rota: string): void {
  sujoPorRota.delete(rota);
}

/** Alguma tela montada declarou estado para esta rota? */
export function rotaTemEstadoDeclarado(rota: string): boolean {
  return sujoPorRota.has(rota);
}

/** Há trabalho não salvo declarado nesta rota? */
export function rotaEstaSuja(rota: string): boolean {
  return sujoPorRota.get(rota)?.sujo === true;
}

/**
 * O verbo do botao de confirmacao, quando a tela sabe qual e.
 *
 * O montador de kit grava em segundo plano ao sair: rotular a saida de "Sair sem
 * salvar" ali contradiz o proprio aviso dele ("a gravacao continua").
 */
export function rotuloDaRota(rota: string): string | null {
  return sujoPorRota.get(rota)?.rotulo ?? null;
}

/** O aviso que a tela pediu, se pediu algum. */
export function mensagemDaRota(rota: string): string | null {
  return sujoPorRota.get(rota)?.mensagem ?? null;
}

/**
 * Autorização de saída para quem JÁ perguntou ao usuário.
 *
 * Com o aviso global ligado (`GlobalExitGuard`), toda navegação interna passa
 * por um portão único. As telas que já confirmam por conta própria — o "Sair e
 * gravar" do montador de kit, o voltar do portal — navegam depois da resposta e
 * seriam interrogadas de novo: perguntar duas vezes ensina o usuário a
 * confirmar sem ler, e aí a pergunta que importa passa batida.
 *
 * A janela é curta porque a navegação acontece no mesmo instante da resposta:
 * autorização esquecida não pode liberar uma saída de minutos depois.
 */
const JANELA_DE_AUTORIZACAO_MS = 2000;

/**
 * Trabalho que so pode acontecer DEPOIS da saida confirmada.
 *
 * O carrinho do cabecalho apagava a linha do banco no mesmo clique que pedia a
 * navegacao. Com o portao global segurando essa navegacao, cancelar deixava o
 * usuario na tela e o carrinho apagado: os itens nunca chegavam ao orcamento.
 * Quem tem efeito colateral na saida agenda aqui e o portao executa somente
 * quando o usuario confirma.
 */
const acoesAposSaida: Array<() => void> = [];

export function agendarAposSaida(acao: () => void): void {
  acoesAposSaida.push(acao);
}

export function executarAcoesAposSaida(): void {
  acoesAposSaida.splice(0).forEach((acao) => acao());
}

export function descartarAcoesAposSaida(): void {
  acoesAposSaida.length = 0;
}
let autorizadoEm = 0;

/** Quem acabou de confirmar a saída avisa aqui, imediatamente antes de navegar. */
export function autorizarSaida(): void {
  autorizadoEm = Date.now();
}

/** Vale a autorização recente? Lida sem consumir: o portão pode ser consultado mais de uma vez. */
export function saidaAutorizada(agora: number = Date.now()): boolean {
  return autorizadoEm > 0 && agora - autorizadoEm <= JANELA_DE_AUTORIZACAO_MS;
}

export function limparAutorizacaoDeSaida(): void {
  autorizadoEm = 0;
}

/**
 * Zera o registro. Chamado no logout: sem isto, o estado sujo de quem saiu
 * sobrevive à sessão e o próximo login é interrogado por trabalho que não é
 * dele. Também usado pelos testes.
 */
export function limparRegistroDeRotas(): void {
  sujoPorRota.clear();
  limparAutorizacaoDeSaida();
  descartarAcoesAposSaida();
}
