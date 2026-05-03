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
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por número, cliente ou empresa..." 
            className="pl-9"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            data-testid="order-search-input"
          />
        </div>
        
        <Select 
          value={filters.status} 
          onValueChange={(val) => updateFilters({ status: val })}
        >
          <SelectTrigger className="w-[200px]" data-testid="order-status-filter">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="order-date-filter">
              <Calendar className="h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "dd/MM", { locale: ptBR })} - {format(filters.dateRange.to, "dd/MM", { locale: ptBR })}
                  </>
                ) : (
                  format(filters.dateRange.from, "dd/MM", { locale: ptBR })
                )
              ) : (
                "Período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={{
                from: filters.dateRange?.from,
                to: filters.dateRange?.to
              }}
              onSelect={(range) => updateFilters({ 
                dateRange: { from: range?.from, to: range?.to } 
              })}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="more-filters-btn">
              <Filter className="h-4 w-4" />
              Mais Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 h-5 min-w-5 justify-center">
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
                  data-testid="company-filter-input"
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full text-xs h-8" 
                onClick={clearFilters}
              >
                Limpar Filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground h-8 px-2"
            onClick={clearFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
