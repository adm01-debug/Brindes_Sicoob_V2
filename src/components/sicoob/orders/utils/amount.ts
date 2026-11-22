/**
 * Interpreta o valor digitado no formulário de nota fiscal.
 *
 * Trocar a vírgula por ponto lia "1.250" como 1,25 e gravava a nota mil vezes
 * menor. Entrada malformada também era adivinhada: "1.250.50" virava 125050
 * (inflando o faturamento) e "1250,OO" caía como campo vazio. Só formas
 * reconhecidas passam; o resto é recusado.
 */
export function parseAmountBR(raw: string): number | undefined {
  const text = raw.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!text) return undefined;

  // Só formas reconhecidamente válidas passam. Antes, entrada malformada caía
  // em `normalized = text` e o descarte silencioso gravava a nota sem valor
  // (ou inflada): "1.250.50" virava 125050 e "1250,OO" virava undefined.
  const milharPonto = /^\d{1,3}(\.\d{3})+$/.test(text);
  const milharPontoComCentavos = /^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(text);
  // Formato US com milhar: "1,250.50" e "1,250". O ponto é o decimal aqui.
  const milharVirgulaComPontoDecimal = /^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(text);
  const milharVirgula = /^\d{1,3}(,\d{3})+$/.test(text);
  const simples = /^\d+(,\d{1,2})?$/.test(text);
  const simplesDecimalPonto = /^\d+(\.\d{1,2})?$/.test(text);

  let normalized: string;
  if (milharPonto) {
    normalized = text.replace(/\./g, "");
  } else if (milharPontoComCentavos) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (milharVirgulaComPontoDecimal) {
    normalized = text.replace(/,/g, "");
  } else if (milharVirgula) {
    normalized = text.replace(/,/g, "");
  } else if (simples) {
    normalized = text.replace(",", ".");
  } else if (simplesDecimalPonto) {
    normalized = text;
  } else {
    return undefined;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}


/**
 * Campo vazio continua opcional; preenchido, precisa ser um valor positivo.
 * Separar a decisão do componente mantém a regra testável e a complexidade
 * ciclomática do formulário sob o limite.
 */
export function isAmountValido(raw: string): boolean {
  if (raw.trim().length === 0) return true;
  const parsed = parseAmountBR(raw);
  return parsed !== undefined && Number.isFinite(parsed) && parsed > 0;
}
