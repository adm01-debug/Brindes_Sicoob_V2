import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Trash2, ExternalLink, Package, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ReleaseEvidencesPage() {
  const queryClient = useQueryClient();
  const [newReleaseTag, setNewReleaseTag] = useState("");
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: releases, isLoading: loadingReleases } = useQuery({
    queryKey: ["qa_releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_releases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: evidences, isLoading: loadingEvidences } = useQuery({
    queryKey: ["qa_evidences", selectedReleaseId],
    queryFn: async () => {
      if (!selectedReleaseId) return [];
      const { data, error } = await supabase
        .from("qa_release_evidences")
        .select("*")
        .eq("release_id", selectedReleaseId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedReleaseId
  });

  const createRelease = useMutation({
    mutationFn: async (tag: string) => {
      const { data, error } = await supabase
        .from("qa_releases")
        .insert({ version_tag: tag })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa_releases"] });
      setNewReleaseTag("");
      toast.success("Release criada com sucesso!");
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedReleaseId) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const filePath = `${selectedReleaseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("qa-evidences")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("qa-evidences")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("qa_release_evidences")
        .insert({
          release_id: selectedReleaseId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["qa_evidences", selectedReleaseId] });
      toast.success("Evidência anexada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao subir arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Evidências de Release - Sicoob QA" description="Gestão de evidências para releases do projeto Sicoob." path="/admin/qa/release-evidences" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-sicoob-green-dark" />
            <h1 className="text-2xl font-bold text-sicoob-green-dark">Evidências de Release</h1>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Tag da Release (ex: v1.0.1)" 
              value={newReleaseTag}
              onChange={(e) => setNewReleaseTag(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => createRelease.mutate(newReleaseTag)} disabled={!newReleaseTag}>
              Nova Release
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm uppercase text-muted-foreground">Releases Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {releases?.map((release) => (
                  <button
                    key={release.id}
                    onClick={() => setSelectedReleaseId(release.id)}
                    className={`w-full text-left p-4 hover:bg-muted transition-colors ${selectedReleaseId === release.id ? 'bg-muted border-l-4 border-primary' : ''}`}
                  >
                    <div className="font-bold">{release.version_tag}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(release.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detalhes e Evidências</span>
                {selectedReleaseId && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="evidence-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm">
                        <FileUp className="h-4 w-4" />
                        Subir Evidência
                      </div>
                      <Input 
                        id="evidence-upload" 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedReleaseId ? (
                <div className="p-8 text-center text-muted-foreground italic">
                  Selecione uma release para gerenciar evidências.
                </div>
              ) : (
                <div className="space-y-4">
                  {loadingEvidences ? (
                    <div className="text-center py-4">Carregando evidências...</div>
                  ) : evidences?.length === 0 ? (
                    <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                      Nenhuma evidência anexada a esta release.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {evidences?.map((ev) => (
                        <div key={ev.id} className="group relative border rounded-lg p-4 hover:border-primary transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 truncate">
                              <p className="font-medium text-sm truncate">{ev.file_name}</p>
                              <p className="text-xs text-muted-foreground uppercase">{ev.file_type?.split('/')[1] || 'arquivo'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={ev.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 text-blue-500" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
