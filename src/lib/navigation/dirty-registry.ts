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
}

const sujoPorRota = new Map<string, EstadoDaRota>();

/**
 * A tela assume a responsabilidade de dizer se tem trabalho pendente — e,
 * quando quiser, o que avisar. O texto genérico ("alterações não salvas") não
 * diz ao usuário o que ele perde; a tela sabe.
 */
export function declararEstadoDaRota(rota: string, sujo: boolean, mensagem?: string): void {
  sujoPorRota.set(rota, { sujo, mensagem });
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

/** O aviso que a tela pediu, se pediu algum. */
export function mensagemDaRota(rota: string): string | null {
  return sujoPorRota.get(rota)?.mensagem ?? null;
}

/**
 * Zera o registro. Chamado no logout: sem isto, o estado sujo de quem saiu
 * sobrevive à sessão e o próximo login é interrogado por trabalho que não é
 * dele. Também usado pelos testes.
 */
export function limparRegistroDeRotas(): void {
  sujoPorRota.clear();
}
