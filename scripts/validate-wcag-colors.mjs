#!/usr/bin/env node
/**
 * validate-wcag-colors
 * --------------------------------------------------------------
 * Valida contraste WCAG AA nos tokens principais do Sicoob Design
 * System. Antes este script só imprimia o resultado e sempre saia
 * com código 0 — um par de cores reprovado passava despercebido.
 * Agora ele falha o processo (exit 1) quando algum par fica abaixo
 * do mínimo exigido.
 *
 * Uso local:
 *   node scripts/validate-wcag-colors.mjs
 *   node scripts/validate-wcag-colors.mjs --level aaa --json
 *
 * Exit codes: 0 = todos os pares aprovados, 1 = reprovação, 2 = uso inválido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli, EXIT_FAIL } from './lib/cli.mjs';

const MIN_RATIO = { aa: 4.5, aaa: 7 };
const CSS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.css');

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1, l2) {
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Lidos de verdade de src/index.css (não copiar valores aqui — a cópia
// hardcoded divergia silenciosamente do CSS real e mascarava regressões).
function extractCssBlock(css, selector) {
  const selectorIndex = css.indexOf(selector);
  if (selectorIndex === -1) {
    throw new Error(`Seletor "${selector}" não encontrado em ${CSS_PATH}`);
  }
  const braceStart = css.indexOf('{', selectorIndex);
  let depth = 0;
  let i = braceStart;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) break;
  }
  return css.slice(braceStart + 1, i);
}

function parseHslToken(block, name) {
  const match = block.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!match) throw new Error(`Token --${name} não encontrado no bloco de src/index.css`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function loadTokensFromCss() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const lightBlock = extractCssBlock(css, ':root {');
  const darkBlock = extractCssBlock(css, '.dark {');
  const names = ['brand', 'primary', 'reward', 'background', 'foreground'];
  const light = Object.fromEntries(names.map((name) => [name, parseHslToken(lightBlock, name)]));
  const dark = Object.fromEntries(names.map((name) => [name, parseHslToken(darkBlock, name)]));
  dark.accent = parseHslToken(darkBlock, 'accent');
  dark.accent_fg = parseHslToken(darkBlock, 'accent-foreground');
  return { light, dark };
}

const TOKENS = loadTokensFromCss();

function luminanceOf(token) {
  return getLuminance(...hslToRgb(...token));
}

function buildPairs(mode) {
  const theme = TOKENS[mode];
  const bgLum = luminanceOf(theme.background);
  const pairs = ['brand', 'primary', 'reward'].map((token) => ({
    label: `${token} vs background`,
    ratio: getContrastRatio(luminanceOf(theme[token]), bgLum),
  }));

  pairs.push({
    label: 'foreground vs background',
    ratio: getContrastRatio(luminanceOf(theme.foreground), bgLum),
  });

  if (mode === 'dark') {
    pairs.push({
      label: 'accent (amarelo) vs primary_fg',
      ratio: getContrastRatio(luminanceOf(theme.accent), luminanceOf(theme.accent_fg)),
    });
  }

  return pairs;
}

await runCli(
  {
    name: 'validate-wcag-colors',
    summary: 'Valida contraste WCAG dos tokens do Sicoob Design System.',
    usage: 'node scripts/validate-wcag-colors.mjs [opções]',
    spec: {
      level: {
        type: 'string',
        default: 'aa',
        description: 'Nível WCAG: aa (4.5:1) ou aaa (7:1)',
      },
      json: { type: 'boolean', default: false, description: 'Emite o resultado em JSON' },
    },
    examples: [
      'node scripts/validate-wcag-colors.mjs',
      'node scripts/validate-wcag-colors.mjs --level aaa --json',
    ],
  },
  async ({ values, log }) => {
    const level = String(values.level).toLowerCase();
    const minRatio = MIN_RATIO[level];
    if (!minRatio) {
      return { exitCode: 2, message: `Nível inválido: ${values.level}. Use "aa" ou "aaa".` };
    }

    const results = [];
    for (const mode of Object.keys(TOKENS)) {
      for (const pair of buildPairs(mode)) {
        results.push({ mode, ...pair, pass: pair.ratio >= minRatio });
      }
    }

    const failures = results.filter((result) => !result.pass);

    if (values.json) {
      console.log(JSON.stringify({ level, minRatio, results }, null, 2));
    } else {
      for (const mode of Object.keys(TOKENS)) {
        log.info(`--- Modo ${mode.toUpperCase()} (mínimo ${minRatio}:1) ---`);
        for (const result of results.filter((item) => item.mode === mode)) {
          const status = result.pass ? 'OK  ' : 'FALHA';
          const line = `${status} ${result.label}: ${result.ratio.toFixed(2)}:1`;
          if (result.pass) console.log(`  ${line}`);
          else log.error(`  ${line} (abaixo de ${minRatio}:1)`);
        }
      }
    }

    if (failures.length > 0) {
      return {
        exitCode: EXIT_FAIL,
        message: `${failures.length} par(es) de cor reprovado(s) no nível ${level.toUpperCase()}.`,
      };
    }
    if (!values.json) log.info(`Todos os pares aprovados no nível ${level.toUpperCase()}.`);
    return 0;
  },
);
