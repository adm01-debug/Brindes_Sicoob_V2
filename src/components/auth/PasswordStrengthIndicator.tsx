import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { usePasswordBreachCheck } from '@/hooks/usePasswordBreachCheck';
import { useDebounce } from '@/hooks/useDebounce';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  onStrengthChange?: (isStrong: boolean) => void;
}

interface StrengthCriteria {
  label: string;
  met: boolean;
}

type Strength = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

function getStrength(score: number, isEmpty: boolean): { strength: Strength; color: string; label: string } {
  if (isEmpty) return { strength: 'empty', color: 'bg-muted', label: '' };
  if (score <= 2) return { strength: 'weak', color: 'bg-destructive', label: 'Fraca' };
  if (score === 3) return { strength: 'fair', color: 'bg-warning', label: 'Razoável' };
  if (score === 4) return { strength: 'good', color: 'bg-warning', label: 'Boa' };
  return { strength: 'strong', color: 'bg-success', label: 'Forte' };
}

function analyzePassword(password: string) {
  const criteria: StrengthCriteria[] = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /[0-9]/.test(password) },
    { label: 'Caractere especial (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = criteria.filter((criterion) => criterion.met).length;
  return { criteria, score, allMet: criteria.every((criterion) => criterion.met), ...getStrength(score, password.length === 0) };
}

function formatBreachCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function StrengthBar({ analysis }: { analysis: ReturnType<typeof analyzePassword> }) {
  const textColor = { empty: '', weak: 'text-destructive', fair: 'text-warning', good: 'text-warning', strong: 'text-success' }[analysis.strength];
  return <div className="space-y-1.5"><div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Força da senha</span><span className={cn('text-xs font-medium', textColor)}>{analysis.label}</span></div><div className="flex gap-1">{[1, 2, 3, 4, 5].map((segment) => <div key={segment} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', segment <= analysis.score ? analysis.color : 'bg-muted')} />)}</div></div>;
}

function CriteriaList({ criteria }: { criteria: StrengthCriteria[] }) {
  return <div className="grid grid-cols-2 gap-1.5">{criteria.map((criterion) => <div key={criterion.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', criterion.met ? 'text-success' : 'text-muted-foreground')}>{criterion.met ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}<span>{criterion.label}</span></div>)}</div>;
}

interface BreachStatusProps {
  isChecking: boolean;
  isBreached: boolean;
  hasChecked: boolean;
  count: number | null;
}

function BreachMessage({ isChecking, isBreached, hasChecked, count }: BreachStatusProps) {
  if (isChecking) return <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" /><span className="text-muted-foreground">Verificando em base de vazamentos...</span></>;
  if (isBreached) return <><AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" /><div className="space-y-0.5"><p className="font-medium text-destructive">Senha vazada!</p><p className="text-muted-foreground">Esta senha apareceu em {count ? formatBreachCount(count) : 'vários'} vazamentos de dados. Escolha outra senha mais segura.</p></div></>;
  if (hasChecked) return <><Shield className="h-4 w-4 text-success flex-shrink-0" /><span className="text-success">Senha não encontrada em vazamentos conhecidos</span></>;
  return null;
}

function BreachStatus(props: BreachStatusProps) {
  return <div className={cn('flex items-start gap-2 p-2.5 rounded-lg border text-xs', props.isChecking && 'bg-muted/50 border-muted', props.isBreached && 'bg-destructive/10 border-destructive/30', !props.isChecking && !props.isBreached && props.hasChecked && 'bg-success/10 border-success/30')}><BreachMessage {...props} /></div>;
}

export function PasswordStrengthIndicator({ password, className, onStrengthChange }: PasswordStrengthIndicatorProps) {
  const { isBreached, count, isChecking, checkPassword, reset } = usePasswordBreachCheck();
  const debouncedPassword = useDebounce(password, 500);
  const [hasCheckedBreach, setHasCheckedBreach] = useState(false);
  useEffect(() => {
    if (debouncedPassword && debouncedPassword.length >= 8) {
      void checkPassword(debouncedPassword).then(() => setHasCheckedBreach(true));
    } else {
      reset();
      setHasCheckedBreach(false);
    }
  }, [debouncedPassword, checkPassword, reset]);
  const analysis = useMemo(() => analyzePassword(password), [password]);
  useEffect(() => {
    onStrengthChange?.(analysis.allMet && !isBreached && hasCheckedBreach);
  }, [analysis.allMet, isBreached, hasCheckedBreach, onStrengthChange]);
  if (password.length === 0) return null;
  return (
    <div className={cn('space-y-3', className)}>
      <StrengthBar analysis={analysis} />
      <CriteriaList criteria={analysis.criteria} />
      {password.length >= 8 && <BreachStatus isChecking={isChecking} isBreached={isBreached} hasChecked={hasCheckedBreach} count={count} />}
    </div>
  );
}
