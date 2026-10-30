import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CityEntry {
  id: string;
  city_name: string;
  state: string | null;
  country_code: string;
  is_active: boolean;
  created_at: string;
}

interface CityWhitelistTabProps {
  cities: CityEntry[];
  onAdd: (city: string, state?: string) => Promise<boolean>;
  onRemove: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

function CityAddForm({ city, state, adding, onCityChange, onStateChange, onAdd }: { city: string; state: string; adding: boolean; onCityChange: (value: string) => void; onStateChange: (value: string) => void; onAdd: () => void }) {
  return <div className="flex gap-2 items-end"><div className="flex-1 space-y-1"><Label className="text-xs">Cidade</Label><Input placeholder="Ex: São Paulo" value={city} onChange={(event) => onCityChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAdd()} /></div><div className="w-24 space-y-1"><Label className="text-xs">Estado</Label><Input placeholder="SP" value={state} onChange={(event) => onStateChange(event.target.value)} maxLength={2} onKeyDown={(event) => event.key === "Enter" && onAdd()} /></div><Button onClick={onAdd} disabled={adding || !city.trim()} className="gap-1">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Adicionar</Button></div>;
}

function RemoveCityButton({ city, onRemove }: { city: CityEntry; onRemove: (id: string) => void }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover cidade?</AlertDialogTitle><AlertDialogDescription><span className="font-bold">{city.city_name}</span> será removida da whitelist.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onRemove(city.id)} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function CitiesTable({ cities, onRemove, onToggle }: Pick<CityWhitelistTabProps, "cities" | "onRemove" | "onToggle">) {
  if (cities.length === 0) return <div className="text-center py-8 text-muted-foreground"><Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />Nenhuma cidade cadastrada</div>;
  return <Table><TableHeader><TableRow><TableHead>Cidade</TableHead><TableHead>Estado</TableHead><TableHead>País</TableHead><TableHead>Status</TableHead><TableHead>Adicionado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{cities.map((city) => <TableRow key={city.id}><TableCell className="font-medium">{city.city_name}</TableCell><TableCell>{city.state || "—"}</TableCell><TableCell>{city.country_code}</TableCell><TableCell><Switch checked={city.is_active} onCheckedChange={(checked) => onToggle(city.id, checked)} /></TableCell><TableCell className="text-muted-foreground text-xs">{format(new Date(city.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell><TableCell className="text-right"><RemoveCityButton city={city} onRemove={onRemove} /></TableCell></TableRow>)}</TableBody></Table>;
}

export function CityWhitelistTab({ cities, onAdd, onRemove, onToggle }: CityWhitelistTabProps) {
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newCity.trim()) return;
    setAdding(true);
    const ok = await onAdd(newCity.trim(), newState.trim() || undefined);
    if (ok) { setNewCity(""); setNewState(""); }
    setAdding(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Cidades na Whitelist</CardTitle>
        <CardDescription>Adicione cidades de onde é permitido acessar o sistema. A localização é detectada pelo IP do usuário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CityAddForm city={newCity} state={newState} adding={adding} onCityChange={setNewCity} onStateChange={setNewState} onAdd={handleAdd} />
        <CitiesTable cities={cities} onRemove={onRemove} onToggle={onToggle} />
      </CardContent>
    </Card>
  );
}
