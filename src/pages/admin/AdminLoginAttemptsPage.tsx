import { useState } from 'react';
import { useLoginAttempts, useLoginAttemptStats } from '@/hooks/useLoginAttempts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, ShieldAlert, ShieldCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSEO } from '@/components/seo/PageSEO';

type LoginAttemptData = NonNullable<ReturnType<typeof useLoginAttempts>['data']>;
type LoginAttemptStats = NonNullable<ReturnType<typeof useLoginAttemptStats>['data']>;

function LoginStats({ stats }: { stats: LoginAttemptStats | undefined }) {
  const cards = [
    {
      label: 'Total 24h',
      value: stats?.total24h || 0,
      icon: <Shield className="h-8 w-8 text-primary" />,
    },
    {
      label: 'Falhas 24h',
      value: stats?.failed24h || 0,
      icon: <ShieldAlert className="h-8 w-8 text-destructive" />,
    },
    {
      label: 'Taxa de Falha',
      value: `${stats?.failRate24h || 0}%`,
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    },
    {
      label: 'Total 7 dias',
      value: stats?.total7d || 0,
      icon: <Shield className="h-8 w-8 text-muted-foreground" />,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {card.icon}
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function statusFilterValue(value: boolean | null) {
  if (value === null) return 'all';
  return value ? 'success' : 'failed';
}

function LoginFilters({
  email,
  status,
  onEmailChange,
  onStatusChange,
}: {
  email: string;
  status: boolean | null;
  onEmailChange: (value: string) => void;
  onStatusChange: (value: boolean | null) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Filtrar tentativas por email"
              placeholder="Filtrar por email..."
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilterValue(status)}
            onValueChange={(value) => onStatusChange(value === 'all' ? null : value === 'success')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function AttemptRow({ attempt }: { attempt: LoginAttemptData['attempts'][number] }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
      </TableCell>
      <TableCell className="font-mono text-sm">{attempt.email}</TableCell>
      <TableCell>
        <Badge variant={attempt.success ? 'default' : 'destructive'}>
          {attempt.success ? 'Sucesso' : 'Falha'}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-sm">{attempt.ip_address}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
        {attempt.failure_reason || '—'}
      </TableCell>
    </TableRow>
  );
}

function AttemptsBody({
  data,
  isLoading,
}: {
  data: LoginAttemptData | undefined;
  isLoading: boolean;
}) {
  if (isLoading)
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
          Carregando...
        </TableCell>
      </TableRow>
    );
  if (!data?.attempts.length)
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
          Nenhuma tentativa encontrada
        </TableCell>
      </TableRow>
    );
  return (
    <>
      {data.attempts.map((attempt) => (
        <AttemptRow key={attempt.id} attempt={attempt} />
      ))}
    </>
  );
}

function LoginPagination({
  data,
  page,
  onPageChange,
}: {
  data: LoginAttemptData | undefined;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!data || data.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {data.totalPages} ({data.totalCount} registros)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= data.totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AttemptsTable({
  data,
  isLoading,
  page,
  onPageChange,
}: {
  data: LoginAttemptData | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Tentativas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AttemptsBody data={data} isLoading={isLoading} />
          </TableBody>
        </Table>
        <LoginPagination data={data} page={page} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}

export default function AdminLoginAttemptsPage() {
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<boolean | null>(null);

  const { data, isLoading } = useLoginAttempts({
    page,
    pageSize: 30,
    emailFilter: emailFilter || undefined,
    successFilter,
  });

  const { data: stats } = useLoginAttemptStats();

  const changeEmail = (value: string) => {
    setEmailFilter(value);
    setPage(1);
  };
  const changeStatus = (value: boolean | null) => {
    setSuccessFilter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <PageSEO
        title="Tentativas de Login"
        description="Monitore tentativas de login e atividades suspeitas."
        path="/admin/login-attempts"
        noIndex
      />
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tentativas de Login</h1>
        <p className="text-muted-foreground">
          Monitoramento de acessos e tentativas de autenticação
        </p>
      </div>

      <LoginStats stats={stats} />
      <LoginFilters
        email={emailFilter}
        status={successFilter}
        onEmailChange={changeEmail}
        onStatusChange={changeStatus}
      />
      <AttemptsTable data={data} isLoading={isLoading} page={page} onPageChange={setPage} />
    </div>
  );
}
