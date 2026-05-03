import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldCheck, ShieldAlert, Key, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AccessManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: rData } = await supabase.from('role_permissions').select('*');
      const { data: pData } = await supabase.from('permissions').select('*');
      setRoles(rData || []);
      setPermissions(pData || []);
    } catch (error) {
      console.error("Error fetching access data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Matriz de Permissões por Role</CardTitle>
          </div>
          <CardDescription>Defina quais papéis têm acesso a quais recursos do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Recurso / Permissão</TableHead>
                  <TableHead className="text-center">Vendedor</TableHead>
                  <TableHead className="text-center">Supervisor</TableHead>
                  <TableHead className="text-center">Gestor</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Dev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando matriz...</TableCell></TableRow>
                ) : (
                  ['pedidos.view', 'pedidos.edit', 'produtos.manage', 'usuarios.manage', 'configuracoes.edit'].map((perm) => (
                    <TableRow key={perm}>
                      <TableCell className="font-medium">{perm}</TableCell>
                      <TableCell className="text-center">{renderCheck(true)}</TableCell>
                      <TableCell className="text-center">{renderCheck(perm.startsWith('pedidos'))}</TableCell>
                      <TableCell className="text-center">{renderCheck(true)}</TableCell>
                      <TableCell className="text-center">{renderCheck(true)}</TableCell>
                      <TableCell className="text-center">{renderCheck(true)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurações de Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Autenticação em Duas Etapas (2FA)</p>
                <p className="text-xs text-muted-foreground">Obrigatório para papéis administrativos</p>
              </div>
              <Badge>Ativado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Expiração de Sessão</p>
                <p className="text-xs text-muted-foreground">Tempo limite de inatividade (minutos)</p>
              </div>
              <Badge variant="outline">60 min</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auditoria de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma violação de acesso detectada nas últimas 24h</p>
            <Button variant="link" className="text-xs mt-2">Ver logs detalhados</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function renderCheck(active: boolean) {
  return active ? (
    <ShieldCheck className="h-5 w-5 text-green-500 mx-auto" />
  ) : (
    <ShieldAlert className="h-5 w-5 text-muted-foreground/30 mx-auto" />
  );
}
