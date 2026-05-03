import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface OrderFiltersProps {
  onSearch: (query: string) => void;
  onStatusChange: (status: string) => void;
}

export function OrderFilters({ onSearch, onStatusChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por número, cliente ou empresa..." 
          className="pl-9"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <Select onValueChange={onStatusChange} defaultValue="all">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="rascunho">Rascunho</SelectItem>
          <SelectItem value="enviado_gestor">Pendente Aprovação</SelectItem>
          <SelectItem value="aprovado_gestor">Aprovado</SelectItem>
          <SelectItem value="em_producao">Em Produção</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" className="gap-2">
        <Calendar className="h-4 w-4" />
        Período
      </Button>
      
      <Button variant="ghost" size="sm" className="gap-2">
        <Filter className="h-4 w-4" />
        Mais Filtros
      </Button>
    </div>
  );
}
