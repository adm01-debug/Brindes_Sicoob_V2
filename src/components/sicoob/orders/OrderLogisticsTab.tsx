import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Calendar, MapPin, Package, Camera, Loader2, Info, Plus } from "lucide-react";
import { useOrderLogistics, useOrderInvoices } from "@/hooks/orders/extensions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUpdateSicoobOrderStatus } from "@/hooks/sicoob/useSicoobOrder";
import { supabase } from "@/integrations/supabase/client";

interface OrderLogisticsTabProps {
  orderId: string;
}

export function OrderLogisticsTab({ orderId }: OrderLogisticsTabProps) {
  const { logistics, updateLogistics, isLoading } = useOrderLogistics(orderId);
  const { uploadFile } = useOrderInvoices(orderId);
  const updateStatus = useUpdateSicoobOrderStatus();
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logistics?.tracking_code) setTrackingCode(logistics.tracking_code);
    if (logistics?.carrier_name) setCarrier(logistics.carrier_name);
  }, [logistics]);

  const handleUpdateTracking = async () => {
    await updateLogistics.mutateAsync({
      tracking_code: trackingCode,
      carrier_name: carrier,
      status: 'in_transit'
    });

    // Ao atualizar rastreio, mover pedido para status logística se ainda não estiver
    updateStatus.mutate({ 
      orderId, 
      status: 'logistic',
      observations: `Rastreio atualizado: ${carrier} - ${trackingCode}` 
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      
      const fileName = `${orderId}/delivery-photo-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('order-documents')
        .upload(fileName, file);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('order-documents')
        .getPublicUrl(data.path);
      
      await updateLogistics.mutateAsync({
        delivery_photo_url: publicUrl,
        status: 'delivered'
      });

      // Se a foto foi enviada (comprovante), mover para Concluído
      updateStatus.mutate({ 
        orderId, 
        status: 'completed',
        observations: "Entrega comprovada via foto/anexo logístico." 
      });
      
      toast.success("Foto de entrega enviada e pedido concluído");
    } catch (error: any) {
      toast.error("Erro no upload da foto: " + error.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando dados logísticos...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-900">Gestão de Fluxo Logístico</p>
          <p className="text-[10px] text-blue-700 leading-relaxed">
            Ao confirmar o rastreio, o pedido transita automaticamente para o status <strong>Logística</strong>. 
            O upload do comprovante de entrega finaliza o processo movendo o pedido para <strong>Concluído</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Transportadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{logistics?.carrier_name || "Não informada"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Código de Rastreio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{logistics?.tracking_code || "---"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Previsão de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {logistics?.estimated_delivery ? new Date(logistics.estimated_delivery).toLocaleDateString('pt-BR') : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atualizar Informações de Rastreio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transportadora</Label>
              <Input 
                id="carrier" 
                placeholder="Ex: Braspress, Correios" 
                value={carrier} 
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Código de Rastreio</Label>
              <Input 
                id="tracking" 
                placeholder="Código de rastreamento" 
                value={trackingCode} 
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
          </div>
          <Button 
            className="bg-sicoob-green hover:bg-sicoob-green-dark text-white"
            onClick={handleUpdateTracking} 
            disabled={updateLogistics.isPending || !trackingCode.trim() || !carrier.trim()}
          >
            {updateLogistics.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : "Confirmar Rastreio"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Comprovante de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/30">
            {logistics?.delivery_photo_url ? (
              <div className="space-y-4 text-center">
                <img 
                  src={logistics.delivery_photo_url} 
                  alt="Comprovante de entrega" 
                  className="max-w-xs rounded-lg border shadow-sm mx-auto"
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
                  Alterar Foto
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nenhuma foto enviada</p>
                  <p className="text-xs text-muted-foreground">Envie uma foto do comprovante ou do produto entregue.</p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
                  {isUploadingPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar Foto
                </Button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
