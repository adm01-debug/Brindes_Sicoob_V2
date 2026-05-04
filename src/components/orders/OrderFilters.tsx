import React, { useState } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export interface OrderFilterValues {
  search: string;
  status: string;
  clientCompany: string;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface OrderFiltersProps {
  onFiltersChange: (filters: OrderFilterValues) => void;
}

export function OrderFilters({ onFiltersChange }: OrderFiltersProps) {
  const [filters, setFilters] = useState<OrderFilterValues>({
    search: '',
    status: 'all',
    clientCompany: '',
    dateRange: {
      from: undefined,
      to: undefined
    }
  });

  const updateFilters = (updates: Partial<OrderFilterValues>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const reset = {
      search: '',
      status: 'all',
      clientCompany: '',
      dateRange: { from: undefined, to: undefined }
    };
    setFilters(reset);
    onFiltersChange(reset);
  };

  const activeFiltersCount = [
    filters.status !== 'all',
    filters.clientCompany !== '',
    !!filters.dateRange?.from
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        {/* Busca */}
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            Pesquisar
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="search"
              placeholder="Buscar por número ou cliente..." 
              className="pl-9 h-11 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>
        </div>
        
        {/* Status */}
        <div className="w-full md:w-56 space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            Status
          </Label>
          <Select 
            value={filters.status} 
            onValueChange={(val) => updateFilters({ status: val })}
          >
            <SelectTrigger className="h-11 bg-background/50 border-muted-foreground/20">
              <SelectValue placeholder="Todos os Status" />
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
        </div>

        {/* Data Inicial */}
        <div className="w-full md:w-44 space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            Data Inicial
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start h-11 bg-background/50 border-muted-foreground/20 text-left font-normal px-3">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {filters.dateRange?.from ? format(filters.dateRange.from, "dd/MM/yyyy") : <span className="text-muted-foreground">__/__/____</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateRange?.from}
                onSelect={(date) => updateFilters({ dateRange: { ...filters.dateRange, from: date, to: filters.dateRange?.to } })}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Data Final */}
        <div className="w-full md:w-44 space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
            Data Final
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start h-11 bg-background/50 border-muted-foreground/20 text-left font-normal px-3">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {filters.dateRange?.to ? format(filters.dateRange.to, "dd/MM/yyyy") : <span className="text-muted-foreground">__/__/____</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateRange?.to}
                onSelect={(date) => updateFilters({ dateRange: { ...filters.dateRange, from: filters.dateRange?.from, to: date } })}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Botão de Filtros */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 px-4 gap-2 border-primary/20 hover:bg-primary/5 text-primary">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4 p-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa do Cliente</label>
                <Input 
                  placeholder="Nome da empresa..." 
                  value={filters.clientCompany}
                  onChange={(e) => updateFilters({ clientCompany: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={clearFilters}
                >
                  Limpar
                </Button>
                <Button className="flex-1">Aplicar</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
            onClick={clearFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Remover todos os filtros
          </Button>
        </div>
      )}
    </div>
  );
}
