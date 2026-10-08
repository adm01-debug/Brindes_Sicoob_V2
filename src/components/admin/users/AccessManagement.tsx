import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_COLUMNS: Array<{ role: AppRole; label: string }> = [
  { role: "vendedor", label: "Vendedor" },
  { role: "supervisor", label: "Supervisor" },
  { role: "manager", label: "Gestor" },
  { role: "admin", label: "Admin" },
  { role: "dev", label: "Dev" },
];

function PermissionMatrix({ rolePermissions, permissions, loading }: { rolePermissions: RolePermission[]; permissions: Permission[]; loading: boolean }) {
  return <Card><CardHeader><div className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /><CardTitle>Matriz de Permissões por Role</CardTitle></div><CardDescription>Defina quais papéis têm acesso a quais recursos do sistema</CardDescription></CardHeader><CardContent><div className="rounded-md border overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-[200px]">Recurso / Permissão</TableHead>{ROLE_COLUMNS.map(({ role, label }) => <TableHead key={role} className="text-center">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando matriz...</TableCell></TableRow> : permissions.map(permission => <TableRow key={permission.id}><TableCell className="font-medium">{permission.name || permission.code}</TableCell>{ROLE_COLUMNS.map(({ role }) => <TableCell key={role} className="text-center">{renderCheck(rolePermissions.some(entry => entry.role === role && entry.permission_code === permission.code))}</TableCell>)}</TableRow>)}</TableBody></Table></div></CardContent></Card>;
}

function SecuritySummary() {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card><CardHeader><CardTitle className="text-base">Configurações de Segurança</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Autenticação em Duas Etapas (2FA)</p><p className="text-xs text-muted-foreground">Obrigatório para papéis administrativos</p></div><Badge>Ativado</Badge></div><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Expiração de Sessão</p><p className="text-xs text-muted-foreground">Tempo limite de inatividade (minutos)</p></div><Badge variant="outline">60 min</Badge></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Auditoria de Acesso</CardTitle></CardHeader><CardContent className="text-center py-6"><ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-50" /><p className="text-sm text-muted-foreground">Nenhuma violação de acesso detectada nas últimas 24h</p><Button variant="link" className="text-xs mt-2">Ver logs detalhados</Button></CardContent></Card></div>;
}

export function AccessManagement() {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: rData } = await supabase.from('role_permissions').select('*');
      const { data: pData } = await supabase.from('permissions').select('*');
      setRolePermissions(rData || []);
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
      <PermissionMatrix rolePermissions={rolePermissions} permissions={permissions} loading={isLoading} />
      <SecuritySummary />
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
