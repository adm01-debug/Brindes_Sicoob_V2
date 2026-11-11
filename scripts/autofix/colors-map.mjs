/**
 * Codemod de cores hardcoded -> tokens semânticos (sem IA, 100% determinístico).
 *
 * Convenção seguida: a que o próprio código já usa (ver `grep -rho "bg-warning/[0-9]*" src`):
 *   texto  : text-<token>                      (qualquer tom)
 *   fundo  : tom claro (<=300) -> bg-<token>/10  | com opacidade -> /5
 *            tom forte (>=400) -> bg-<token>     | com opacidade -> mantém a opacidade
 *   borda  : tom claro (<=300) -> border-<token>/30 | com opacidade -> /20
 *            tom forte (>=400) -> border-<token>    | com opacidade -> mantém a opacidade
 * Variantes (hover:, dark:, data-[state=checked]:, ...) são preservadas.
 */

export const FAMILIES = {
  amber: 'warning',
  blue: 'info',
  emerald: 'success',
  red: 'destructive',
};

// Opacidade arbitrária (`/[0.1]`) fica de fora de propósito: continua apontada pelo checker.
const RE =
  /(?<![\w-])((?:[A-Za-z0-9_[\]=.&>*-]+:)*)(bg|text|border)-(amber|blue|emerald|red)-(\d{2,3})(?:\/(\d{1,3}))?(?![\w/-])/g;

export function hasHardcodedColor(source) {
  return new RegExp(RE.source).test(source);
}

// No Tailwind, o papel "sutil"/claro no modo dark é feito pelos tons ALTOS (800/900/950) — o
// oposto do modo claro, onde é feito pelos tons baixos. `dark:bg-red-950` ao lado de
// `bg-red-50` no claro são o MESMO par sutil, não um par "claro translúcido / escuro sólido".
// Convertê-los pela mesma régua (shade >= 400 -> token sólido) trocaria um fundo discreto por
// um bloco cheio só no dark. Em vez de arriscar o par errado, a conversão é pulada e sinalizada.
const DARK_HIGH_SHADE = 700;

export function mapClass(kind, family, shade, opacity) {
  const token = FAMILIES[family];
  const light = Number(shade) <= 300;
  const op = opacity ? `/${opacity}` : '';
  if (kind === 'text') return `text-${token}${op}`;
  if (kind === 'bg') return light ? `bg-${token}/${opacity ? '5' : '10'}` : `bg-${token}${op}`;
  return light ? `border-${token}/${opacity ? '20' : '30'}` : `border-${token}${op}`;
}

/**
 * @returns {{ output: string, count: number, review: number[], skipped: number }}
 *   review = linhas (1-based) com fundo sólido de token + `text-white`: o par certo
 *   seria `text-<token>-foreground`, mas isso é decisão visual, então só sinalizamos.
 *   skipped = quantas classes `dark:*-{700..950}` foram preservadas sem conversão (ver nota acima).
 */
export function convertColors(source) {
  let count = 0;
  let skipped = 0;
  const output = source.replace(RE, (m, variants, kind, family, shade, opacity) => {
    // `text` sempre mapeia pro mesmo `text-<token>`, sem ramo claro/forte — o risco do parágrafo
    // acima só existe pra bg/border (que trocam de tradução conforme o tom).
    const isDark = kind !== 'text' && variants.split(':').includes('dark');
    if (isDark && Number(shade) >= DARK_HIGH_SHADE) {
      skipped += 1;
      return m;
    }
    count += 1;
    return variants + mapClass(kind, family, shade, opacity);
  });
  const review = [];
  if (count > 0) {
    output.split('\n').forEach((line, i) => {
      if (/\bbg-(warning|info|success|destructive)(?![\w/-])/.test(line) && /\btext-white\b/.test(line)) {
        review.push(i + 1);
      }
    });
  }
  return { output, count, review, skipped };
}
