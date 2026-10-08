import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Calendar, Camera, Info, Loader2, Package, Plus, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSicoobShipment, useUpdateSicoobShipment } from '@/hooks/sicoob/useSicoobFulfillment';
import type { OrderStatus } from '@/types/sicoob/orders';
import { sicoobDocumentIngestService } from '@/services/sicoob/documentIngestService';

interface OrderLogisticsTabProps {
  orderId: string;
  orderStatus: OrderStatus;
  canManage: boolean;
}

const DELIVERY_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function useDeliveryPhoto(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return undefined; }
    void supabase.storage.from("sicoob-order-documents").createSignedUrl(path, 10 * 60).then(({ data, error }) => {
      if (active && !error) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  return url;
}

function useShipmentForm(shipment: ReturnType<typeof useSicoobShipment>["data"]) {
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");
  useEffect(() => { setTrackingCode(shipment?.tracking_code || ""); setCarrier(shipment?.carrier_name || ""); }, [shipment]);
  return { trackingCode, setTrackingCode, carrier, setCarrier };
}

interface LogisticsActionsContext {
  orderId: string;
  orderStatus: OrderStatus;
  canManageTracking: boolean;
  canConfirmDelivery: boolean;
  form: ReturnType<typeof useShipmentForm>;
  updateShipment: ReturnType<typeof useUpdateSicoobShipment>;
}

function useLogisticsActions(context: LogisticsActionsContext) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const updateTracking = async () => {
    if (!context.canManageTracking) return;
    try {
      await context.updateShipment.mutateAsync({ orderId: context.orderId, expectedOrderStatus: context.orderStatus, carrierName: context.form.carrier, trackingCode: context.form.trackingCode });
      toast.success("Rastreio salvo e pedido encaminhado para logística.");
    } catch (error) { toast.error("Não foi possível salvar o rastreio.", { description: error instanceof Error ? error.message : undefined }); }
  };
  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!context.canConfirmDelivery) { event.target.value = ""; return; }
    const file = event.target.files?.[0];
    if (!file) return;
    if (!DELIVERY_IMAGE_EXTENSIONS[file.type]) { toast.error("Envie o comprovante em JPEG, PNG ou WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("O comprovante deve ter no máximo 5 MB."); return; }
    setIsUploadingPhoto(true);
    try {
      const document = await sicoobDocumentIngestService.ingest(context.orderId, "delivery_proof", file);
      await context.updateShipment.mutateAsync({ orderId: context.orderId, expectedOrderStatus: context.orderStatus, deliveryPhotoPath: document.path });
      toast.success("Comprovante enviado e entrega concluída.");
    } catch (error) { toast.error("Não foi possível registrar o comprovante.", { description: error instanceof Error ? error.message : undefined }); }
    finally { setIsUploadingPhoto(false); event.target.value = ""; }
  };
  return { isUploadingPhoto, updateTracking, uploadPhoto };
}

function LogisticsInfo() {
  return <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3"><Info className="h-5 w-5 text-blue-500 mt-0.5" /><div className="space-y-1"><p className="text-xs font-bold text-blue-900">Gestão de fluxo logístico</p><p className="text-[10px] text-blue-700 leading-relaxed">O rastreio move o pedido da separação para o trânsito. O comprovante privado confirma a entrega; pedidos legados em logística continuam aceitos.</p></div></div>;
}

function ShipmentSummary({ shipment }: { shipment: ReturnType<typeof useSicoobShipment>["data"] }) {
  const forecast = shipment?.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString("pt-BR") : "N/A";
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Transportadora</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{shipment?.carrier_name || "Não informada"}</p></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />Código de rastreio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold font-mono">{shipment?.tracking_code || "---"}</p></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Previsão de entrega</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{forecast}</p></CardContent></Card></div>;
}

function TrackingCard({ form, canManage, pending, onSave }: { form: ReturnType<typeof useShipmentForm>; canManage: boolean; pending: boolean; onSave: () => void }) {
  const disabled = !canManage || pending || !form.trackingCode.trim() || !form.carrier.trim();
  return <Card><CardHeader><CardTitle className="text-lg">Atualizar informações de rastreio</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="carrier">Transportadora</Label><Input id="carrier" placeholder="Ex.: Braspress, Correios" value={form.carrier} onChange={event => form.setCarrier(event.target.value)} disabled={!canManage} /></div><div className="space-y-2"><Label htmlFor="tracking">Código de rastreio</Label><Input id="tracking" placeholder="Código de rastreamento" value={form.trackingCode} onChange={event => form.setTrackingCode(event.target.value)} disabled={!canManage} /></div></div><Button className="bg-sicoob-green hover:bg-sicoob-green-dark text-white" onClick={onSave} disabled={disabled}>{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Confirmar rastreio"}</Button></CardContent></Card>;
}

function DeliveryProofCard({ url, canUpload, uploading, inputRef, onUpload }: { url: string | null; canUpload: boolean; uploading: boolean; inputRef: RefObject<HTMLInputElement>; onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) {
  const openPicker = () => inputRef.current?.click();
  return <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5" />Comprovante de entrega</CardTitle></CardHeader><CardContent><div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/30">{url ? <div className="space-y-4 text-center"><img src={url} alt="Comprovante de entrega" className="max-w-xs rounded-lg border shadow-sm mx-auto" /><Button variant="outline" size="sm" onClick={openPicker} disabled={!canUpload || uploading}>Alterar comprovante</Button></div> : <div className="text-center space-y-3"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Camera className="h-6 w-6 text-primary" /></div><div className="space-y-1"><p className="text-sm font-medium">Nenhum comprovante enviado</p><p className="text-xs text-muted-foreground">Envie uma imagem de até 5 MB quando o pedido estiver em trânsito.</p></div><Button onClick={openPicker} disabled={!canUpload || uploading}>{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Enviar comprovante</Button></div>}<input type="file" ref={inputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onUpload} /></div></CardContent></Card>;
}

export function OrderLogisticsTab({ orderId, orderStatus, canManage }: OrderLogisticsTabProps) {
  const { data: shipment, isLoading } = useSicoobShipment(orderId);
  const updateShipment = useUpdateSicoobShipment();
  const form = useShipmentForm(shipment);
  const deliveryPhotoUrl = useDeliveryPhoto(shipment?.delivery_photo_path);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManageTracking = canManage && ['in_separation', 'in_transit', 'logistic'].includes(orderStatus);
  const canConfirmDelivery = canManage && (orderStatus === 'in_transit' || orderStatus === 'logistic');
  const actions = useLogisticsActions({ orderId, orderStatus, canManageTracking, canConfirmDelivery, form, updateShipment });

  if (isLoading) return <div className="p-8 text-center">Carregando dados logísticos...</div>;

  return (
    <div className="space-y-6">
      <LogisticsInfo />
      <ShipmentSummary shipment={shipment} />
      <TrackingCard form={form} canManage={canManageTracking} pending={updateShipment.isPending} onSave={actions.updateTracking} />
      <DeliveryProofCard url={deliveryPhotoUrl} canUpload={canConfirmDelivery} uploading={actions.isUploadingPhoto} inputRef={fileInputRef} onUpload={actions.uploadPhoto} />
    </div>
  );
}
