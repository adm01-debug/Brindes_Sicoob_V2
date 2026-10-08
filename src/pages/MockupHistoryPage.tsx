import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Image, Search, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PageSEO } from "@/components/seo/PageSEO";

interface GeneratedMockup {
  id: string;
  product_name: string | null;
  product_sku: string | null;
  client_name: string | null;
  technique_name: string | null;
  location_name: string | null;
  colors_count: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  mockup_url: string | null;
  layout_url: string | null;
  created_at: string;
}

export default function MockupHistoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mockup-history", page, search],
    queryFn: async () => {
      let query = supabase
        .from("generated_mockups")
        .select("*", { count: "exact" })
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search) {
        query = query.or(`product_name.ilike.%${search}%,client_name.ilike.%${search}%,product_sku.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { mockups: data as GeneratedMockup[], totalCount: count || 0 };
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("generated_mockups").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover mockup");
    } else {
      toast.success("Mockup removido");
      refetch();
    }
  };

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      <PageSEO title="Histórico de Mockups" description="Visualize todos os mockups gerados anteriormente." path="/mockup-historico" noIndex />
      <div>
        <h1 data-testid="page-title-mockup-historico" className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Image className="h-6 w-6" />
          Histórico de Mockups
        </h1>
        <p className="text-muted-foreground">Todos os mockups gerados por você</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto, SKU ou cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{data?.totalCount || 0}</p>
            <p className="text-sm text-muted-foreground">Total de Mockups</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mockups Gerados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Dimensões</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !data?.mockups.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum mockup gerado ainda
                  </TableCell>
                </TableRow>
              ) : (
                data.mockups.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.mockup_url ? (
                        <img
                          src={m.mockup_url}
                          alt="Mockup"
                          className="h-12 w-12 object-cover rounded border"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{m.product_name || "—"}</p>
                        {m.product_sku && (
                          <p className="text-xs text-muted-foreground font-mono">{m.product_sku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{m.client_name || "—"}</TableCell>
                    <TableCell>
                      {m.technique_name ? (
                        <Badge variant="secondary">{m.technique_name}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{m.location_name || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {m.logo_width_cm && m.logo_height_cm
                        ? `${m.logo_width_cm}×${m.logo_height_cm}cm`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {m.mockup_url && (
                          <Button
                            variant="ghost"
                            size="icon" aria-label="Download"
                            onClick={() => window.open(m.mockup_url!, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon" aria-label="Excluir"
                          onClick={() => handleDelete(m.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
