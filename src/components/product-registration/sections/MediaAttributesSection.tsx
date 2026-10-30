/**
 * MediaAttributesSection — Imagens, Cores, Materiais, Técnicas
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "@/components/ui/FormSection";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormSchema, ReferenceDataState } from "../productFormTypes";

interface MediaAttributesSectionProps {
  form: UseFormReturn<ProductFormSchema>;
  referenceData: ReferenceDataState;
}

type ImageItem = ProductFormSchema['images'][number];

function ImagesEditor({ images, newImageUrl, setNewImageUrl, addImage, removeImage, setPrimary, error }: { images: ImageItem[]; newImageUrl: string; setNewImageUrl: (value: string) => void; addImage: () => void; removeImage: (index: number) => void; setPrimary: (index: number) => void; error?: string }) {
  return <FormSection title="Imagens" required description="Adicione pelo menos uma imagem do produto"><div className="space-y-4"><div className="flex gap-2"><Input aria-label="URL da imagem do produto" placeholder="Cole a URL da imagem" value={newImageUrl} onChange={event => setNewImageUrl(event.target.value)} onKeyDown={event => event.key === "Enter" && (event.preventDefault(), addImage())} /><Button type="button" onClick={addImage} variant="secondary"><ImagePlus className="h-4 w-4 mr-2" />Adicionar</Button></div>{images.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{images.map((image, index) => <Card key={`${image.url}-${index}`} className={cn("relative overflow-hidden", image.is_primary && "ring-2 ring-primary")}><CardContent className="p-2"><img src={image.url} alt={image.alt_text || `Imagem ${index + 1}`} className="w-full h-24 object-cover rounded" onError={event => { event.currentTarget.src = "/placeholder.svg"; }} /><div className="flex items-center justify-between mt-2"><Button type="button" variant="ghost" size="sm" onClick={() => setPrimary(index)} className={cn("text-xs", image.is_primary && "text-primary")}>{image.is_primary ? "Principal" : "Definir como principal"}</Button><Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => removeImage(index)} className="h-6 w-6 text-destructive"><X className="h-4 w-4" /></Button></div></CardContent></Card>)}</div>}{error && <p className="text-sm text-destructive">{error}</p>}</div></FormSection>;
}

interface AttributeItem { id: string; label: string; color?: string | null }

function AttributeBadges({ title, required, items, selected, onToggle, error }: { title: string; required?: boolean; items: AttributeItem[]; selected: string[]; onToggle: (id: string) => void; error?: string }) {
  return <FormSection title={title} required={required} description={required ? `Selecione ${title.toLowerCase()}` : undefined} collapsible={!required} defaultOpen={required ? undefined : false}><div className="flex flex-wrap gap-2">{items.map(item => <Badge key={item.id} variant={selected.includes(item.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => onToggle(item.id)}>{item.color && <span className="w-3 h-3 rounded-full mr-1.5 border" style={{ backgroundColor: item.color }} />}{item.label}</Badge>)}</div>{error && <p className="text-sm text-destructive mt-2">{error}</p>}</FormSection>;
}

export function MediaAttributesSection({ form, referenceData }: MediaAttributesSectionProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const images = form.watch("images");
  const selectedColors = form.watch("colors");
  const selectedMaterials = form.watch("materials");
  const selectedTechniques = form.watch("technique_ids") || [];

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl);
      const current = form.getValues("images");
      form.setValue("images", [...current, { url: newImageUrl, is_primary: current.length === 0 }]);
      setNewImageUrl("");
    } catch { form.setError("images", { message: "URL inválida" }); }
  };

  const removeImage = (index: number) => {
    const current = form.getValues("images");
    const next = current.filter((_, i) => i !== index);
    const firstRemainingImage = next[0];
    if (current[index]?.is_primary && firstRemainingImage) firstRemainingImage.is_primary = true;
    form.setValue("images", next);
  };

  const setPrimary = (index: number) => {
    form.setValue("images", form.getValues("images").map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const toggle = (field: "colors" | "materials" | "technique_ids", id: string) => {
    const current = form.getValues(field) || [];
    form.setValue(field, current.includes(id) ? current.filter((v: string) => v !== id) : [...current, id]);
  };

  return (
    <>
      <ImagesEditor images={images} newImageUrl={newImageUrl} setNewImageUrl={setNewImageUrl} addImage={addImage} removeImage={removeImage} setPrimary={setPrimary} error={form.formState.errors.images?.message} />
      <AttributeBadges title="Cores Disponíveis" required items={referenceData.colors.map(color => ({ id: color.id, label: color.color_name, color: color.hex_code }))} selected={selectedColors} onToggle={id => toggle("colors", id)} error={form.formState.errors.colors?.message} />
      <AttributeBadges title="Materiais" required items={referenceData.materials.map(material => ({ id: material.id, label: material.material_name }))} selected={selectedMaterials} onToggle={id => toggle("materials", id)} error={form.formState.errors.materials?.message} />
      <AttributeBadges title="Técnicas de Personalização" items={referenceData.techniques.map(technique => ({ id: technique.id, label: technique.name }))} selected={selectedTechniques} onToggle={id => toggle("technique_ids", id)} />
    </>
  );
}
