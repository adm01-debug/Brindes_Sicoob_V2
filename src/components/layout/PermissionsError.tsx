import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function PermissionsError() {
  const { refreshSession, signOut } = useAuth();
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="max-w-md space-y-4" aria-labelledby="permissions-error-title">
        <h1 id="permissions-error-title" className="text-xl font-semibold">Não foi possível carregar suas permissões</h1>
        <p role="alert" className="text-muted-foreground">Confira sua conexão e tente novamente. Seu acesso permanece protegido.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void refreshSession()}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => void signOut()}>Voltar ao login</Button>
        </div>
      </section>
    </main>
  );
}
