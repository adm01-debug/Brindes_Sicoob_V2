import { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Truck, Loader2, Save } from "lucide-react";
import { useOrderLogistics } from "@/hooks/orders/extensions";


interface OrderFulfillmentManagerProps {
  orderId: string;
  currentFulfillmentStatus: string;
}

type Logistics = ReturnType<typeof useOrderLogistics>["logistics"];

function toDateInputValue(value: string | null | undefined): string {
  return value ? (new Date(value).toISOString().split("T")[0] ?? "") : "";
}

function isFormDirty(logistics: Logistics, values: string[]): boolean {
  const [tracking, shippingType, carrier, deliveryForecast] = values;
  if (!logistics) return values.some(Boolean);
  return tracking !== (logistics.tracking_number ?? "") || shippingType !== (logistics.shipping_type ?? "") || carrier !== (logistics.carrier ?? "") || deliveryForecast !== toDateInputValue(logistics.estimated_delivery);
}

function FormField({ id, label, value, onChange, placeholder, type }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function LoadingCard() {
  return <Card><CardContent className="py-10 flex flex-col items-center justify-center space-y-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Carregando dados logísticos...</p></CardContent></Card>;
}

function useFulfillmentForm(logistics: Logistics, onSave: (values: { tracking_number: string | null; shipping_type: string | null; carrier: string | null; estimated_delivery: string | null }) => void) {
  const [tracking, setTracking] = useState("");
  const [shippingType, setShippingType] = useState("");
  const [carrier, setCarrier] = useState("");
  const [deliveryForecast, setDeliveryForecast] = useState("");
  useEffect(() => {
    if (!logistics) return;
    setTracking(logistics.tracking_number ?? "");
    setShippingType(logistics.shipping_type ?? "");
    setCarrier(logistics.carrier ?? "");
    setDeliveryForecast(toDateInputValue(logistics.estimated_delivery));
  }, [logistics]);
  const values = [tracking, shippingType, carrier, deliveryForecast];
  const save = () => onSave({ tracking_number: tracking || null, shipping_type: shippingType || null, carrier: carrier || null, estimated_delivery: deliveryForecast || null });
  return { tracking, setTracking, shippingType, setShippingType, carrier, setCarrier, deliveryForecast, setDeliveryForecast, dirty: isFormDirty(logistics, values), save };
}

type FulfillmentForm = ReturnType<typeof useFulfillmentForm>;

function LogisticsForm({ form, isSaving }: { form: FulfillmentForm; isSaving: boolean }) {
  return (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormField id="ship-type" label="Tipo de Frete" value={form.shippingType} onChange={form.setShippingType} placeholder="Ex: Correios, Transportadora..." /><FormField id="carrier" label="Empresa de Transporte" value={form.carrier} onChange={form.setCarrier} placeholder="Nome da transportadora" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormField id="tracking" label="Código de Rastreio" value={form.tracking} onChange={form.setTracking} placeholder="Código para acompanhamento" /><FormField id="forecast" label="Previsão de Entrega" type="date" value={form.deliveryForecast} onChange={form.setDeliveryForecast} /></div>
      <div className="flex justify-end pt-2"><Button onClick={form.save} disabled={!form.dirty || isSaving} className="gap-2">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar Logística</Button></div>
    </CardContent>
  );
}

export function OrderFulfillmentManager({ orderId }: OrderFulfillmentManagerProps) {
  const { logistics, isLoading, updateLogistics } = useOrderLogistics(orderId);
  const form = useFulfillmentForm(logistics, values => updateLogistics.mutate(values));
  if (isLoading) return <LoadingCard />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-primary" /> Dados de Logística
        </CardTitle>
        <CardDescription>Gerencie o rastreio e transporte deste pedido.</CardDescription>
      </CardHeader>
      <LogisticsForm form={form} isSaving={updateLogistics.isPending} />
    </Card>
  );
}
