/**
 * Global keyboard shortcuts modal — opens with `?` key.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const SHORTCUTS: { keys: string[]; label: string; section: string }[] = [
  { keys: ['←', '→'], label: 'Navegar entre etapas', section: 'Wizard' },
  { keys: ['1', '2', '3', '4'], label: 'Pular para etapa específica', section: 'Wizard' },
  { keys: ['Ctrl', 'Z'], label: 'Desfazer', section: 'Edição' },
  { keys: ['Ctrl', 'Y'], label: 'Refazer', section: 'Edição' },
  { keys: ['Ctrl', 'S'], label: 'Salvar kit', section: 'Edição' },
  { keys: ['?'], label: 'Mostrar atalhos', section: 'Ajuda' },
  { keys: ['Esc'], label: 'Fechar diálogos', section: 'Ajuda' },
];

function ShortcutSections() {
  const sections = Array.from(new Set(SHORTCUTS.map((shortcut) => shortcut.section)));
  return <div className="space-y-4">{sections.map((section) => <div key={section}>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{section}</p>
    <div className="space-y-1.5">{SHORTCUTS.filter((shortcut) => shortcut.section === section).map((shortcut) =>
      <div key={shortcut.label} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40">
        <span className="text-sm">{shortcut.label}</span><div className="flex items-center gap-1">
          {shortcut.keys.map((key) => <kbd key={key}
            className="px-1.5 py-0.5 text-[10px] font-display font-semibold tabular-nums bg-muted border border-border rounded shadow-sm">
            {key}
          </kbd>)}
        </div>
      </div>)}</div>
  </div>)}</div>;
}

export function KitShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Keyboard className="h-5 w-5 text-primary" /> Atalhos de teclado
          </DialogTitle>
          <DialogDescription>Acelere seu fluxo de trabalho</DialogDescription>
        </DialogHeader>
        <ShortcutSections />
      </DialogContent>
    </Dialog>
  );
}
