import { useState, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, FileCode, Download, AlertCircle } from "lucide-react";
import { useOrderInvoices } from "@/hooks/orders/extensions";
import { toast } from "sonner";
import { isAmountValido, parseAmountBR } from "./utils/amount";

interface OrderInvoicesTabProps {
  orderId: string;
  canManage: boolean;
}

type Invoice = NonNullable<ReturnType<typeof useOrderInvoices>["invoices"]>[number];

export function OrderInvoicesTab({ orderId, canManage }: OrderInvoicesTabProps) {
  const { invoices, addInvoice, uploadFile, getInvoiceDownloadUrl, isLoading, error } = useOrderInvoices(orderId);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  // Sem data de emissão e valor a nota fica fora de qualquer período do
  // relatório de vendas: o filtro é por `issued_at` e a soma por `amount`.
  const [issuedAt, setIssuedAt] = useState("");
  const [amount, setAmount] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (invoice: Invoice) => {
    const downloadWindow = window.open('about:blank', '_blank');
    try {
      setDownloadingId(invoice.id);
      const signedUrl = await getInvoiceDownloadUrl(invoice.file_path);
      if (downloadWindow) {
        downloadWindow.opener = null;
        downloadWindow.location.replace(signedUrl);
      } else {
        window.location.assign(signedUrl);
      }
    } catch (downloadError) {
      downloadWindow?.close();
      toast.error('Não foi possível preparar o download.', {
        description: downloadError instanceof Error ? downloadError.message : undefined,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const amountValido = isAmountValido(amount);
  const parsedAmount = amountValido ? parseAmountBR(amount) : undefined;
  const podeEnviar = Boolean(invoiceNumber.trim()) && Boolean(issuedAt) && amountValido;

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>, type: 'xml' | 'pdf') => {
    if (!canManage) {
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      const filePath = await uploadFile(file);
      setUploadProgress(70);
      
      await addInvoice.mutateAsync({
        invoice_number: invoiceNumber.trim(),
        file_path: filePath,
        file_type: type,
        issued_at: issuedAt || undefined,
        amount: parsedAmount,
      });
      
      setUploadProgress(100);
      setInvoiceNumber("");
      setIssuedAt("");
      setAmount("");
    } catch (uploadError: unknown) {
      toast.error("Erro no upload: " + (uploadError instanceof Error ? uploadError.message : 'falha desconhecida'));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando notas fiscais...</div>;
  if (error) return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-sm text-destructive">
      <AlertCircle className="h-5 w-5" /> Não foi possível carregar as notas fiscais.
    </div>
  );

  return (
    <div className="space-y-6">
      {canManage && <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Anexar Nova Nota Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número da NF</Label>
              <Input 
                id="invoiceNumber" 
                placeholder="Ex: 000123" 
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuedAt">Data de emissão</Label>
              <Input
                id="issuedAt"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceAmount">Valor da nota (R$)</Label>
              <Input
                id="invoiceAmount"
                inputMode="decimal"
                placeholder="Ex: 1.250,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!amountValido}
              />
              {!amountValido && (
                <p className="text-xs text-destructive">Informe um valor maior que zero.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <input
                type="file"
                accept=".xml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFileUpload(e, 'xml')}
                disabled={isUploading || !podeEnviar}
              />
              <Button variant="outline" className="gap-2" disabled={isUploading || !podeEnviar}>
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
                disabled={isUploading || !podeEnviar}
              />
              <Button variant="outline" className="gap-2" disabled={isUploading || !podeEnviar}>
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
      </Card>}

      <InvoiceList invoices={invoices} downloadingId={downloadingId} onDownload={handleDownload} />
    </div>
  );
}

function InvoiceCard({ invoice, downloading, onDownload }: {
  invoice: Invoice;
  downloading: boolean;
  onDownload: (invoice: Invoice) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-sicoob-green/10 rounded">
            {invoice.file_type === 'xml'
              ? <FileCode className="h-6 w-6 text-sicoob-green" />
              : <FileText className="h-6 w-6 text-sicoob-green" />}
          </div>
          <div>
            <p className="font-bold text-sicoob-green-dark">NF #{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.file_type.toUpperCase()} • Enviado em {new Date(invoice.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Baixar nota fiscal ${invoice.invoice_number}`}
          disabled={downloading} onClick={() => onDownload(invoice)}>
          <Download className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function InvoiceList({
  invoices,
  downloadingId,
  onDownload,
}: {
  invoices: Invoice[] | undefined;
  downloadingId: string | null;
  onDownload: (invoice: Invoice) => void;
}) {
  if (!invoices?.length) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        Nenhuma nota fiscal anexada a este pedido.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} downloading={downloadingId === invoice.id} onDownload={onDownload} />
      ))}
    </div>
  );
}
