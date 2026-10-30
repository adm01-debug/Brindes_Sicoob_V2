import { useState, useEffect, type ReactNode } from 'react';
import { useExternalCompanies, useExternalProducts } from '@/hooks/useExternalDatabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Building2,
  Package,
  RefreshCw,
} from 'lucide-react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';

function ConnectionStatus({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean;
  error: string | null;
  data: unknown[] | null;
}) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Conectando...
      </Badge>
    );
  }
  if (error) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Erro na conexão
      </Badge>
    );
  }
  if (data?.length) {
    return (
      <Badge variant="default" className="gap-1 bg-success">
        <CheckCircle2 className="h-3 w-3" />
        Conectado ({data.length} registros)
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Aguardando...
    </Badge>
  );
}

function ConnectionCard({
  title,
  icon,
  data,
  isLoading,
  error,
  onRefresh,
}: {
  title: string;
  icon: ReactNode;
  data: unknown[] | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          <ConnectionStatus isLoading={isLoading} error={error} data={data} />
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="mb-3"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ExternalDataPanel({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: unknown[] | null;
  isLoading: boolean;
}) {
  let content: ReactNode = (
    <div className="py-8 text-center text-muted-foreground">
      Nenhum dado encontrado ou erro na conexão
    </div>
  );
  if (isLoading) {
    content = (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (data?.length) {
    content = (
      <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">{content}</ScrollArea>
      </CardContent>
    </Card>
  );
}

function ExternalDatabaseHeader() {
  return (
    <div className="flex items-center gap-3">
      <Database className="h-8 w-8 text-primary" />
      <div>
        <h1 className="font-display text-2xl font-bold">Teste de Conexão - Banco Externo</h1>
        <p className="text-muted-foreground">Verificando conexão com o Supabase externo</p>
      </div>
    </div>
  );
}

interface ExternalDatabaseViewProps {
  companies: unknown[] | null;
  products: unknown[] | null;
  loadingCompanies: boolean;
  loadingProducts: boolean;
  companiesError: string | null;
  productsError: string | null;
}

function ConnectionsGrid({
  companies,
  products,
  loadingCompanies,
  loadingProducts,
  companiesError,
  productsError,
  onRefreshCompanies,
  onRefreshProducts,
}: ExternalDatabaseViewProps & {
  onRefreshCompanies: () => void;
  onRefreshProducts: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ConnectionCard
        title="Empresas (Somente Leitura)"
        icon={<Building2 className="h-5 w-5" />}
        data={companies}
        isLoading={loadingCompanies}
        error={companiesError}
        onRefresh={onRefreshCompanies}
      />
      <ConnectionCard
        title="Produtos (CRUD Completo)"
        icon={<Package className="h-5 w-5" />}
        data={products}
        isLoading={loadingProducts}
        error={productsError}
        onRefresh={onRefreshProducts}
      />
    </div>
  );
}

function DatabaseTabs({
  activeTab,
  onTabChange,
  companies,
  products,
  loadingCompanies,
  loadingProducts,
}: Pick<
  ExternalDatabaseViewProps,
  'companies' | 'products' | 'loadingCompanies' | 'loadingProducts'
> & {
  activeTab: string;
  onTabChange: (value: string) => void;
}) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="companies" className="gap-2">
          <Building2 className="h-4 w-4" />
          Empresas
        </TabsTrigger>
        <TabsTrigger value="products" className="gap-2">
          <Package className="h-4 w-4" />
          Produtos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="companies">
        <ExternalDataPanel
          title="Dados das Empresas (bitrix_clients)"
          data={companies}
          isLoading={loadingCompanies}
        />
      </TabsContent>
      <TabsContent value="products">
        <ExternalDataPanel
          title="Dados dos Produtos (products)"
          data={products}
          isLoading={loadingProducts}
        />
      </TabsContent>
    </Tabs>
  );
}

function useExternalDatabaseTestData() {
  const companiesHook = useExternalCompanies();
  const productsHook = useExternalProducts();
  const {
    data: companies,
    isLoading: loadingCompanies,
    error: companiesError,
    fetchAll: fetchCompanies,
  } = companiesHook;
  const {
    data: products,
    isLoading: loadingProducts,
    error: productsError,
    fetchAll: fetchProducts,
  } = productsHook;
  useEffect(() => {
    fetchCompanies({ limit: 10 });
    fetchProducts({ limit: 10 });
  }, [fetchCompanies, fetchProducts]);
  return {
    companies,
    products,
    loadingCompanies,
    loadingProducts,
    companiesError,
    productsError,
    refreshCompanies: () => fetchCompanies({ limit: 10 }),
    refreshProducts: () => fetchProducts({ limit: 10 }),
  };
}

export default function ExternalDatabaseTest() {
  const [activeTab, setActiveTab] = useState('companies');
  const {
    companies,
    products,
    loadingCompanies,
    loadingProducts,
    companiesError,
    productsError,
    refreshCompanies,
    refreshProducts,
  } = useExternalDatabaseTestData();

  return (
    <>
      <PageSEO
        title="Teste de Banco Externo"
        description="Teste de conexão com banco de dados externo."
        path="/external-db-test"
        noIndex
      />
      <div className="container mx-auto space-y-6 py-6">
        <ExternalDatabaseHeader />

        <ConnectionsGrid
          companies={companies}
          products={products}
          loadingCompanies={loadingCompanies}
          loadingProducts={loadingProducts}
          companiesError={companiesError}
          productsError={productsError}
          onRefreshCompanies={refreshCompanies}
          onRefreshProducts={refreshProducts}
        />
        <DatabaseTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          companies={companies}
          products={products}
          loadingCompanies={loadingCompanies}
          loadingProducts={loadingProducts}
        />
      </div>
    </>
  );
}
