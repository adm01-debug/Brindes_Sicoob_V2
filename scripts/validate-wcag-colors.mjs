/**
 * Script para validar contraste WCAG AA (4.5:1 para texto normal) 
 * nos tokens principais do Sicoob Design System.
 */

// Helper: HSL to RGB
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

// Helper: Relative Luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1, l2) {
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Principais pares de cores (Token -> Background)
// Valores extraídos do index.css
const TOKENS = {
  light: {
    brand: [175, 100, 34],
    primary: [190, 100, 13],
    reward: [271, 53, 37],
    success: [155, 60, 38],
    background: [220, 20, 98],
    foreground: [190, 100, 10]
  },
  dark: {
    brand: [175, 90, 38],
    primary: [190, 100, 15],
    reward: [271, 60, 55],
    background: [225, 25, 3],
    foreground: [175, 20, 96],
    accent: [44, 100, 50],
    accent_fg: [190, 100, 13] // Verde institucional como foreground no dark
  }
};

function validate(mode) {
  console.log(`\n--- Validando Modo ${mode.toUpperCase()} ---`);
  const theme = TOKENS[mode];
  const bgLum = getLuminance(...hslToRgb(...theme.background));
  const fgLum = getLuminance(...hslToRgb(...theme.foreground));

  // Testar tokens principais contra background
  const testAgainstBg = ['brand', 'primary', 'reward'];
  testAgainstBg.forEach(token => {
    const tokenLum = getLuminance(...hslToRgb(...theme[token]));
    const ratio = getContrastRatio(tokenLum, bgLum);
    const pass = ratio >= 4.5;
    console.log(`${pass ? '✅' : '❌'} ${token} vs background: ${ratio.toFixed(2)}:1 ${pass ? '' : '(FAIL: < 4.5)'}`);
  });

  // Testar foreground padrão contra background
  const mainRatio = getContrastRatio(fgLum, bgLum);
  const mainPass = mainRatio >= 4.5;
  console.log(`${mainPass ? '✅' : '❌'} foreground vs background: ${mainRatio.toFixed(2)}:1`);

  if (mode === 'dark') {
    // Caso especial: Amarelo sobre Verde Escuro no dark
    const yellowLum = getLuminance(...hslToRgb(...theme.accent));
    const darkGreenLum = getLuminance(...hslToRgb(...theme.accent_fg));
    const ratio = getContrastRatio(yellowLum, darkGreenLum);
    const pass = ratio >= 4.5;
    console.log(`${pass ? '✅' : '❌'} accent (amarelo) vs primary_fg: ${ratio.toFixed(2)}:1 (Custom Dark Pair)`);
  }
}

validate('light');
validate('dark');
