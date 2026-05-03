
import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Inbox,
  Loader2,
  FileDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T | string;
  pageSize?: number;
  emptyState?: React.ReactNode;
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  onExport?: (data: T[]) => void;
  // New props for server-side pagination
  serverSide?: boolean;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' } | null) => void;
  onSearchChange?: (term: string) => void;
  currentPage?: number;
}

export function AdminDataTable<T extends { id?: string | number }>({
  data,
  columns,
  isLoading = false,
  searchPlaceholder = "Buscar...",
  searchKey,
  pageSize: initialPageSize = 10,
  emptyState,
  actions,
  onRowClick,
  className,
  onExport,
  serverSide = false,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  currentPage: externalCurrentPage
}: AdminDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const currentPage = serverSide ? (externalCurrentPage || 1) : localCurrentPage;

  // Debounced search for server-side
  useEffect(() => {
    if (!serverSide) return;
    const timer = setTimeout(() => {
      onSearchChange?.(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, serverSide, onSearchChange]);

  // Client-side filtering/sorting
  const filteredData = useMemo(() => {
    if (serverSide) return data;

    let result = [...data];

    if (searchTerm && searchKey) {
      result = result.filter(item => {
        const value = String(item[searchKey as keyof T] || "").toLowerCase();
        return value.includes(searchTerm.toLowerCase());
      });
    } else if (searchTerm) {
      result = result.filter(item => 
        Object.values(item).some(val => 
          String(val || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof T];
        const bVal = b[sortConfig.key as keyof T];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, searchKey, sortConfig, serverSide]);

  const totalPages = serverSide 
    ? Math.ceil(totalCount / pageSize) 
    : Math.ceil(filteredData.length / pageSize);

  const paginatedData = serverSide 
    ? data 
    : filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    const newConfig: { key: string; direction: 'asc' | 'desc' } | null = 
      sortConfig?.key === key && sortConfig.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' };
    
    setSortConfig(newConfig);
    if (serverSide) {
      onSortChange?.(newConfig);
    }
  };

  const handlePageChange = (page: number) => {
    if (serverSide) {
      onPageChange?.(page);
    } else {
      setLocalCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: string) => {
    const newSize = Number(size);
    setPageSize(newSize);
    if (serverSide) {
      onPageSizeChange?.(newSize);
    } else {
      setLocalCurrentPage(1);
    }
  };

  const actualCount = serverSide ? totalCount : filteredData.length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => { 
              setSearchTerm(e.target.value); 
              if (!serverSide) setLocalCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onExport(serverSide ? data : filteredData)}>
              <FileDown className="h-4 w-4" /> Exportar
            </Button>
          )}
          {actions}
          <Select
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Itens por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 por página</SelectItem>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className={col.sortable ? "cursor-pointer select-none" : ""}>
                  <div 
                    className="flex items-center gap-2"
                    onClick={() => col.sortable && handleSort(String(col.accessorKey))}
                  >
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown className={cn(
                        "h-3 w-3 opacity-50",
                        sortConfig?.key === col.accessorKey && "opacity-100 text-primary"
                      )} />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando dados...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Nenhum dado encontrado</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow 
                  key={row.id || idx} 
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, cIdx) => (
                    <TableCell key={cIdx}>
                      {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] || "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {Math.min(actualCount, (currentPage - 1) * pageSize + 1)} a {Math.min(actualCount, currentPage * pageSize)} de {actualCount} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
