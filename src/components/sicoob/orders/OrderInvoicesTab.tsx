import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, FileCode, Download, Trash2 } from "lucide-react";
import { useOrderInvoices } from "@/hooks/useOrderExtensions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface OrderInvoicesTabProps {
  orderId: string;
}

export function OrderInvoicesTab({ orderId }: OrderInvoicesTabProps) {
  const { invoices, addInvoice, uploadFile, isLoading } = useOrderInvoices(orderId);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'xml' | 'pdf') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      const publicUrl = await uploadFile(file, `${file.name}-${Date.now()}`);
      setUploadProgress(70);
      
      addInvoice.mutate({
        invoice_number: invoiceNumber || "PROVISÓRIA",
        file_url: publicUrl,
        file_type: type,
        metadata: { original_name: file.name }
      });
      
      setUploadProgress(100);
      setInvoiceNumber("");
      toast.success(`${type.toUpperCase()} enviado com sucesso`);
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando notas fiscais...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Anexar Nova Nota Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número da NF (Opcional)</Label>
              <Input 
                id="invoiceNumber" 
                placeholder="Ex: 000123" 
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <input
                type="file"
                accept=".xml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFileUpload(e, 'xml')}
                disabled={isUploading}
              />
              <Button variant="outline" className="gap-2" disabled={isUploading || !invoiceNumber.trim()}>
                <FileCode className="h-4 w-4" />
                Upload XML
              </Button>
            </div>
            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFileUpload(e, 'pdf')}
                disabled={isUploading}
              />
              <Button variant="outline" className="gap-2" disabled={isUploading || !invoiceNumber.trim()}>
                <FileText className="h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Enviando arquivo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {invoices?.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
            Nenhuma nota fiscal anexada a este pedido.
          </div>
        ) : (
          invoices?.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    {invoice.file_type === 'xml' ? <FileCode className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">NF #{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.file_type.toUpperCase()} • Enviado em {new Date(invoice.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={invoice.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
