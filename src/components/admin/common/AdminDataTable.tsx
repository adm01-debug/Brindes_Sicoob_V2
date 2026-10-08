
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

const DataTableRow = React.memo(function DataTableRow<T extends { id?: string | number }>({ 
  row, 
  columns, 
  onRowClick 
}: { 
  row: T; 
  columns: Column<T>[]; 
  onRowClick?: (row: T) => void 
}) {
  return (
    <TableRow 
      className={cn(onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors")}
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col, cIdx) => (
        <TableCell key={cIdx}>
          {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] || "-")}
        </TableCell>
      ))}
    </TableRow>
  );
}) as <T extends { id?: string | number }>(props: {
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}) => React.ReactElement;

interface TableToolbarProps<T> {
  actions?: React.ReactNode;
  data: T[];
  filteredData: T[];
  onExport?: (data: T[]) => void;
  onPageSizeChange: (size: string) => void;
  pageSize: number;
  searchPlaceholder: string;
  searchTerm: string;
  serverSide: boolean;
  setSearchTerm: (value: string) => void;
  resetLocalPage: () => void;
}

function TableToolbar<T>({
  actions, data, filteredData, onExport, onPageSizeChange, pageSize,
  searchPlaceholder, searchTerm, serverSide, setSearchTerm, resetLocalPage,
}: TableToolbarProps<T>) {
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!serverSide) resetLocalPage();
  };
  const exportData = () => onExport?.(serverSide ? data : filteredData);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={searchPlaceholder} value={searchTerm} onChange={(event) => handleSearch(event.target.value)} className="pl-9" />
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={exportData}>
            <FileDown className="h-4 w-4" /> Exportar
          </Button>
        )}
        {actions}
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Itens por página" /></SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size} por página</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface DataGridProps<T extends { id?: string | number }> {
  columns: Column<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  isLoading: boolean;
  onRowClick?: (row: T) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
}

function DataGrid<T extends { id?: string | number }>({
  columns, data, emptyState, isLoading, onRowClick, onSort, sortConfig,
}: DataGridProps<T>) {
  const body = isLoading ? (
    <TableRow><TableCell colSpan={columns.length} className="h-48 text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      </div>
    </TableCell></TableRow>
  ) : data.length === 0 ? (
    <TableRow><TableCell colSpan={columns.length} className="h-48 text-center">
      {emptyState || <div className="flex flex-col items-center justify-center gap-2"><Inbox className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum dado encontrado</p></div>}
    </TableCell></TableRow>
  ) : data.map((row, index) => (
    <DataTableRow key={row.id || index} row={row} columns={columns} onRowClick={onRowClick} />
  ));

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader><TableRow>{columns.map((column, index) => (
          <TableHead key={index} className={column.sortable ? "cursor-pointer select-none" : ""}>
            <div className="flex items-center gap-2" onClick={() => column.sortable && onSort(String(column.accessorKey))}>
              {column.header}
              {column.sortable && <ArrowUpDown className={cn("h-3 w-3 opacity-50", sortConfig?.key === column.accessorKey && "opacity-100 text-primary")} />}
            </div>
          </TableHead>
        ))}</TableRow></TableHeader>
        <TableBody>{body}</TableBody>
      </Table>
    </div>
  );
}

function pageNumber(index: number, currentPage: number, totalPages: number): number {
  if (totalPages <= 5) return index + 1;
  if (currentPage <= 3) return index + 1;
  if (currentPage >= totalPages - 2) return totalPages - 4 + index;
  return currentPage - 2 + index;
}

interface PaginationProps {
  actualCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalPages: number;
}

function Pagination({ actualCount, currentPage, onPageChange, pageSize, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Mostrando {Math.min(actualCount, (currentPage - 1) * pageSize + 1)} a {Math.min(actualCount, currentPage * pageSize)} de {actualCount} resultados
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />Anterior
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageNumber(index, currentPage, totalPages)).map((page) => (
            <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => onPageChange(page)}>{page}</Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Próxima<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface PaginationStateInput<T> {
  data: T[];
  filteredData: T[];
  serverSide: boolean;
  totalCount: number;
  pageSize: number;
  localCurrentPage: number;
  externalCurrentPage?: number;
}

function paginationState<T>({
  data, filteredData, serverSide, totalCount, pageSize, localCurrentPage, externalCurrentPage,
}: PaginationStateInput<T>) {
  const currentPage = serverSide ? (externalCurrentPage || 1) : localCurrentPage;
  const actualCount = serverSide ? totalCount : filteredData.length;
  const totalPages = Math.ceil(actualCount / pageSize);
  const paginatedData = serverSide
    ? data
    : filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return { currentPage, actualCount, totalPages, paginatedData };
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
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        Object.entries(item).some(([key, val]) => {
          if (key === 'id') return false; // Skip ID for search
          return String(val || "").toLowerCase().includes(lowerSearch);
        })
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

  const { currentPage, actualCount, totalPages, paginatedData } = paginationState({
    data, filteredData, serverSide, totalCount, pageSize, localCurrentPage, externalCurrentPage,
  });

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

  return (
    <div className={cn("space-y-4", className)}>
      <TableToolbar
        actions={actions} data={data} filteredData={filteredData} onExport={onExport}
        onPageSizeChange={handlePageSizeChange} pageSize={pageSize} searchPlaceholder={searchPlaceholder}
        searchTerm={searchTerm} serverSide={serverSide} setSearchTerm={setSearchTerm}
        resetLocalPage={() => setLocalCurrentPage(1)}
      />
      <DataGrid columns={columns} data={paginatedData} emptyState={emptyState} isLoading={isLoading}
        onRowClick={onRowClick} onSort={handleSort} sortConfig={sortConfig} />
      <Pagination actualCount={actualCount} currentPage={currentPage} onPageChange={handlePageChange}
        pageSize={pageSize} totalPages={totalPages} />
    </div>
  );
}
