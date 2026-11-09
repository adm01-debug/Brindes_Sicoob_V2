import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { convertColors } from '../../scripts/autofix/colors-map.mjs';

const conv = (s: string) => convertColors(s).output as string;

describe('autofix colors-map', () => {
  it('texto: qualquer tom vira o token', () => {
    expect(conv('text-amber-700')).toBe('text-warning');
    expect(conv('text-blue-500')).toBe('text-info');
  });

  it('fundo claro vira /10 (ou /5 quando já tinha opacidade)', () => {
    expect(conv('bg-amber-100')).toBe('bg-warning/10');
    expect(conv('bg-amber-50')).toBe('bg-warning/10');
    expect(conv('bg-amber-50/50')).toBe('bg-warning/5');
    expect(conv('bg-amber-500/10')).toBe('bg-warning/10');
  });

  it('fundo forte vira sólido', () => {
    expect(conv('bg-amber-500')).toBe('bg-warning');
    expect(conv('bg-blue-500')).toBe('bg-info');
  });

  it('borda: clara /30, com opacidade /20, forte mantém', () => {
    expect(conv('border-amber-200')).toBe('border-warning/30');
    expect(conv('border-amber-300/60')).toBe('border-warning/20');
    expect(conv('border-amber-500/20')).toBe('border-warning/20');
    expect(conv('border-blue-500')).toBe('border-info');
  });

  it('preserva variantes', () => {
    expect(conv('hover:bg-amber-600')).toBe('hover:bg-warning');
    expect(conv('data-[state=checked]:bg-amber-500')).toBe('data-[state=checked]:bg-warning');
    expect(conv('hover:bg-blue-50 hover:text-blue-700')).toBe('hover:bg-info/10 hover:text-info');
  });

  it('cobre emerald e red do checker', () => {
    expect(conv('text-emerald-600 bg-red-100')).toBe('text-success bg-destructive/10');
  });

  it('não toca em tokens, outras famílias nem opacidade arbitrária', () => {
    const intacto = 'bg-warning/10 text-slate-500 bg-amber-500/[0.1] text-amberish-700 foo-bg-amber-500';
    expect(conv(intacto)).toBe(intacto);
  });

  it('é idempotente', () => {
    const once = conv('bg-amber-100 text-amber-700 border-amber-200 hover:bg-blue-50');
    expect(conv(once)).toBe(once);
  });

  it('sinaliza fundo sólido com text-white para revisão', () => {
    const r = convertColors('<A />\n<B className="bg-amber-500 text-white" />');
    expect(r.review).toEqual([2]);
  });
});
