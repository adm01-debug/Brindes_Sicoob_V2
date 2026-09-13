import { useState, type ChangeEvent } from "react";
import { useOrderInvoices } from "@/hooks/orders/extensions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, FileUp, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface OrderInvoicesManagerProps {
  orderId: string;
}

export function OrderInvoicesManager({ orderId }: OrderInvoicesManagerProps) {
  const { invoices, isLoading, addInvoice, uploadFile, getInvoiceDownloadUrl } = useOrderInvoices(orderId);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [accessKey, setAccessKey] = useState("");

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const filePath = await uploadFile(file);
      const fileType = file.name.toLowerCase().endsWith(".xml") ? "xml" : "pdf";
      
      await addInvoice.mutateAsync({
        invoice_number: invoiceNumber.trim(),
        access_key: accessKey || null,
        file_path: filePath,
        file_type: fileType,
      });

      setInvoiceNumber("");
      setAccessKey("");
      toast.success("Nota fiscal enviada com sucesso!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar nota fiscal");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (invoiceId: string, filePath: string) => {
    const downloadWindow = window.open('about:blank', '_blank');
    try {
      setDownloadingId(invoiceId);
      const signedUrl = await getInvoiceDownloadUrl(filePath);
      if (downloadWindow) {
        downloadWindow.opener = null;
        downloadWindow.location.replace(signedUrl);
      } else {
        window.location.assign(signedUrl);
      }
    } catch (error: unknown) {
      downloadWindow?.close();
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar o download.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Notas Fiscais
            </CardTitle>
            <CardDescription>Gerencie faturas e documentos fiscais do pedido.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para adicionar NF */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
          <div className="space-y-2">
            <Label htmlFor="nf-number">Número da NF</Label>
            <Input 
              id="nf-number" 
              placeholder="Ex: 001.234" 
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="access-key">Chave de Acesso</Label>
            <Input 
              id="access-key" 
              placeholder="44 dígitos" 
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="block mb-2">Arquivo (PDF ou XML)</Label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="w-full relative overflow-hidden" 
                disabled={isUploading || !invoiceNumber.trim()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Selecionar e Enviar Arquivo
                  </>
                )}
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept=".pdf,.xml"
                  onChange={handleFileUpload}
                  disabled={isUploading || !invoiceNumber.trim()}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de NFs */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            invoices.map((nf) => (
              <div key={nf.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">NF {nf.invoice_number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(nf.created_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Baixar"
                    aria-label={`Baixar nota fiscal ${nf.invoice_number}`}
                    disabled={downloadingId === nf.id}
                    onClick={() => handleDownload(nf.id, nf.file_path)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {nf.access_key && (
                    <Badge variant="secondary" className="hidden sm:flex text-[10px] font-mono">
                      {nf.access_key.slice(0, 4)}...{nf.access_key.slice(-4)}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <p className="text-sm">Nenhuma nota fiscal anexada.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
