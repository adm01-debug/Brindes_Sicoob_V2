import {  useEffect } from "react";
import { useDropboxFiles } from "@/hooks/useDropboxFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, File, ArrowUp, Image, RefreshCw, CloudOff, Cloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSEO } from "@/components/seo/PageSEO";

export default function DropboxBrowserPage() {
  const {
    entries, isLoading, isConnected, currentPath,
    checkConnection, listFiles, navigateToFolder, navigateUp,
  } = useDropboxFiles();

  useEffect(() => {
    checkConnection().then((connected) => {
      if (connected) listFiles("");
    });
  }, []);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  if (isConnected === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <PageSEO title="Navegador de Arquivos" description="Navegue e gerencie arquivos do Dropbox integrado." path="/dropbox" noIndex />
        <CloudOff className="h-16 w-16 text-muted-foreground" />
        <h2 data-testid="page-title-dropbox" className="font-display text-xl font-semibold text-foreground">Dropbox não conectado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Configure o token de acesso do Dropbox nas variáveis de ambiente para usar esta integração.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="page-title-dropbox" className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            Dropbox
          </h1>
          <p className="text-muted-foreground">Navegue pelos arquivos do Dropbox</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => listFiles(currentPath)}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Breadcrumb */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => listFiles("")}
            >
              Raiz
            </Button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => listFiles("/" + pathParts.slice(0, i + 1).join("/"))}
                >
                  {part}
                </Button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Arquivos</CardTitle>
          {currentPath && (
            <Button variant="ghost" size="sm" onClick={navigateUp}>
              <ArrowUp className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Pasta vazia</p>
          ) : (
            <div className="divide-y">
              {entries
                .sort((a, b) => {
                  if (a[".tag"] === "folder" && b[".tag"] !== "folder") return -1;
                  if (a[".tag"] !== "folder" && b[".tag"] === "folder") return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-3 px-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      if (entry[".tag"] === "folder") navigateToFolder(entry.path_lower);
                    }}
                  >
                    {entry[".tag"] === "folder" ? (
                      <Folder className="h-5 w-5 text-primary shrink-0" />
                    ) : entry.thumbnail_url ? (
                      <img
                        src={entry.thumbnail_url}
                        alt={entry.name}
                        className="h-10 w-10 object-cover rounded border shrink-0" loading="lazy" />
                    ) : /\.(jpg|jpeg|png|gif|svg)$/i.test(entry.name) ? (
                      <Image className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      {entry.server_modified && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.server_modified).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    {entry.size !== undefined && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {formatSize(entry.size)}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
