import { Link } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { PageSEO } from '@/components/seo/PageSEO';
import { Constants } from '@/integrations/supabase/types';
import { getRoleVisual } from '@/lib/roles';

export default function RolesPage() {
  const roles = Constants.public.Enums.app_role;

  return (
    <SidebarProvider>
      <PageSEO title="Perfis de acesso" description="Consulte os perfis de acesso do sistema." path="/admin/roles" noIndex />
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <BackButton fallbackPath="/admin" />
            <h1 className="font-display text-lg font-semibold">Perfis de acesso</h1>
          </header>
          <main className="mx-auto w-full max-w-[1920px] px-3 py-4 pb-24 sm:px-4 lg:px-6 xl:px-8">
            <Card className="mx-auto max-w-4xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Perfis disponíveis</CardTitle>
                <CardDescription>
                  Os perfis disponíveis são definidos pelo sistema. Atribua perfis a usuários ou ajuste suas permissões nas telas específicas.
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="outline"><Link to="/admin/usuarios">Gerenciar usuários</Link></Button>
                  <Button asChild variant="outline"><Link to="/admin/role-permissoes">Gerenciar permissões</Link></Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {roles.map((role) => {
                      const visual = getRoleVisual(role);
                      return (
                        <TableRow key={role}>
                          <TableCell>
                            <Badge variant="outline" className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />{visual.label}
                            </Badge>
                            <span className="ml-2 text-xs text-muted-foreground">{role}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{visual.description}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
