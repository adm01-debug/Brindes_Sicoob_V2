/**
 * DetailsSection — Descrição, Dimensões, Estoque
 */
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormSection } from "@/components/ui/FormSection";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormSchema } from "../productFormTypes";

interface DetailsSectionProps {
  form: UseFormReturn<ProductFormSchema>;
}

function DescriptionFields({ form }: DetailsSectionProps) {
  return (
    <FormSection title="Descrição" collapsible defaultOpen={false}>
      <div className="space-y-4">
        <FormField control={form.control} name="short_description" render={({ field }) => (
          <FormItem><FormLabel>Descrição Curta</FormLabel><FormControl><Input placeholder="Breve descrição para listagens" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descrição Completa</FormLabel><FormControl><Textarea placeholder="Descrição detalhada do produto..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
    </FormSection>
  );
}

function DimensionFields({ form }: DetailsSectionProps) {
  return (
    <FormSection title="Dimensões e Peso" collapsible defaultOpen={false}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField control={form.control} name="weight_grams" render={({ field }) => <FormItem><FormLabel>Peso (g)</FormLabel><FormControl><Input type="number" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || undefined)} /></FormControl></FormItem>} />
        <FormField control={form.control} name="width_cm" render={({ field }) => <FormItem><FormLabel>Largura (cm)</FormLabel><FormControl><Input type="number" step="0.1" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl></FormItem>} />
        <FormField control={form.control} name="height_cm" render={({ field }) => <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" step="0.1" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl></FormItem>} />
        <FormField control={form.control} name="depth_cm" render={({ field }) => <FormItem><FormLabel>Profundidade (cm)</FormLabel><FormControl><Input type="number" step="0.1" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl></FormItem>} />
      </div>
    </FormSection>
  );
}

function AvailabilityFields({ form }: DetailsSectionProps) {
  return (
    <FormSection title="Estoque e Disponibilidade" collapsible defaultOpen={false}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField control={form.control} name="stock" render={({ field }) => <FormItem><FormLabel>Estoque Atual</FormLabel><FormControl><Input type="number" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>} />
        <FormField control={form.control} name="min_quantity" render={({ field }) => <FormItem><FormLabel>Quantidade Mínima</FormLabel><FormControl><Input type="number" min="1" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} /></FormControl></FormItem>} />
        <FormField control={form.control} name="lead_time_days" render={({ field }) => <FormItem><FormLabel>Prazo de Entrega (dias)</FormLabel><FormControl><Input type="number" min="0" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || undefined)} /></FormControl></FormItem>} />
      </div>
      <div className="flex items-center gap-6 mt-4">
        <FormField control={form.control} name="is_active" render={({ field }) => <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Produto Ativo</FormLabel></FormItem>} />
        <FormField control={form.control} name="is_kit" render={({ field }) => <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">É um Kit</FormLabel></FormItem>} />
      </div>
    </FormSection>
  );
}

export function DetailsSection({ form }: DetailsSectionProps) {
  return (
    <>
      <DescriptionFields form={form} />
      <DimensionFields form={form} />
      <AvailabilityFields form={form} />
    </>
  );
}
