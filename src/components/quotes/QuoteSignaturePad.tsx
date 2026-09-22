import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, PenLine, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuoteSignaturePadProps {
  onSign: (data: { 
    name: string; 
    document: string; 
    signatureDataUrl: string;
    metadata: {
      ip?: string;
      userAgent: string;
      timestamp: string;
    }
  }) => void;
  isSubmitting?: boolean;
}

export function QuoteSignaturePad({ onSign, isSubmitting }: QuoteSignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");

  const clear = () => {
    sigCanvas.current?.clear();
    setHasSignature(false);
  };

  const validateDocument = (doc: string) => {
    // Basic validation for CPF/CNPJ (length check)
    const cleanDoc = doc.replace(/\D/g, "");
    return cleanDoc.length === 11 || cleanDoc.length === 14;
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    
    // Mask for CPF or CNPJ
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    
    setDocument(value);
  };

  const submit = () => {
    if (!hasSignature) {
      toast.error("Por favor, faça a sua assinatura no quadro.");
      return;
    }

    if (!name.trim()) {
      toast.error("Por favor, preencha o seu nome completo.");
      return;
    }

    if (!validateDocument(document)) {
      toast.error("Documento (CPF/CNPJ) inválido.");
      return;
    }

    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    
    if (dataUrl) {
      onSign({ 
        name: name.trim(), 
        document: document.replace(/\D/g, ""), 
        signatureDataUrl: dataUrl,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-md">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            <span>Assinatura Eletrônica</span>
          </div>
          <BadgeSecurity />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sig-name" className="text-sm font-semibold">Nome Completo</Label>
            <Input 
              id="sig-name" 
              placeholder="Digite seu nome igual ao documento"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={isSubmitting}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-doc" className="text-sm font-semibold">CPF ou CNPJ</Label>
            <Input 
              id="sig-doc" 
              placeholder="000.000.000-00"
              value={document} 
              onChange={handleDocumentChange} 
              disabled={isSubmitting}
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Assine no quadro abaixo</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clear}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              disabled={isSubmitting}
            >
              <Eraser className="h-3 w-3 mr-1" /> Limpar quadro
            </Button>
          </div>
          
          <div className={cn(
            "rounded-xl border-2 border-dashed bg-muted/20 transition-colors duration-200",
            hasSignature ? "border-primary/40 bg-white dark:bg-zinc-900" : "border-muted-foreground/20"
          )}>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: "w-full h-44 cursor-crosshair",
              }}
              onBegin={() => setHasSignature(true)}
            />
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <p>Sua resposta, identificação e assinatura serão registradas neste orçamento após a confirmação.</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={submit} 
          disabled={!hasSignature || !name.trim() || !document.trim() || isSubmitting}
          className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processando Assinatura...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" />
              Confirmar e Assinar Eletronicamente
            </>
          )}
        </Button>
        
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium">
          Confira os dados do orçamento antes de confirmar.
        </p>
      </CardContent>
    </Card>
  );
}

function BadgeSecurity() {
  return (
    <div className="flex items-center gap-1.5 bg-success/10 text-success px-2 py-1 rounded-full border border-success/30">
      <ShieldCheck className="h-3 w-3" />
      <span className="text-[10px] font-bold uppercase">Ambiente Seguro</span>
    </div>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
