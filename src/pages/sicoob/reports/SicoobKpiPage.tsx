import React, { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Clock, Target, PackageCheck, Download, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { endOfDay, format, startOfDay, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const COLORS = ["#003641", "#7DB61C", "#9DB7C3", "#E3E829"];

export default function SicoobKpiPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date()
  });

  const { data: stats } = useQuery({
    queryKey: ["sicoob-kpi-stats", date?.from, date?.to],
    queryFn: async () => {
      // Aggregate real data from Supabase
      const { data: completionEvents, error: completionError } = await supabase
        .from("sicoob_order_history")
        .select("order_id, created_at, order:sicoob_orders!inner(total_amount, status)")
        .eq("new_status", "completed")
        .eq("order.status", "completed")
        .gte("created_at", startOfDay(date?.from || subMonths(new Date(), 6)).toISOString())
        .lte("created_at", endOfDay(date?.to || new Date()).toISOString())
        .order("created_at", { ascending: true });
      if (completionError) throw completionError;

      const orders = (completionEvents || []).map((event) => ({
        id: event.order_id,
        total_amount: Number(event.order?.total_amount || 0),
        completed_at: event.created_at,
      }));

      const total = orders?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;
      const count = orders?.length || 0;
      const avg = count > 0 ? total / count : 0;

      // Group by month for chart
      const monthlyData: Record<string, { name: string; valor: number }> = {};
      orders?.forEach(o => {
        const completedAt = new Date(o.completed_at);
        const monthKey = format(completedAt, "yyyy-MM");
        monthlyData[monthKey] ||= { name: format(completedAt, "MMM/yy", { locale: ptBR }), valor: 0 };
        monthlyData[monthKey].valor += o.total_amount || 0;
      });

      const chartData = Object.entries(monthlyData)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, value]) => value);

      const orderIds = [...new Set(orders.map((order) => order.id))];
      const { data: items, error: itemsError } = orderIds.length > 0
        ? await supabase.from("sicoob_order_items").select("product_name, quantity").in("order_id", orderIds)
        : { data: [], error: null };
      if (itemsError) throw itemsError;

      const productTotals = (items || []).reduce<Record<string, number>>((totals, item) => {
        const name = item.product_name?.trim() || "Produto sem nome";
        totals[name] = (totals[name] || 0) + Number(item.quantity || 0);
        return totals;
      }, {});
      const rankedProducts = Object.entries(productTotals).sort(([, left], [, right]) => right - left);
      const productMix = rankedProducts.slice(0, 4).map(([name, value]) => ({ name, value }));
      const otherUnits = rankedProducts.slice(4).reduce((sum, [, value]) => sum + value, 0);
      if (otherUnits > 0) productMix.push({ name: "Outros", value: otherUnits });
      const totalUnits = rankedProducts.reduce((sum, [, value]) => sum + value, 0);

      return {
        ticketMedio: avg,
        totalVolume: total,
        orderCount: count,
        totalUnits,
        chartData,
        productMix,
      };
    }
  });

  const handleExport = () => {
    if (!stats) return;
    const rows = [
      ["Indicador", "Valor"],
      ["Pedidos concluídos", stats.orderCount],
      ["Unidades entregues", stats.totalUnits],
      ["Volume total", stats.totalVolume.toFixed(2)],
      ["Ticket médio", stats.ticketMedio.toFixed(2)],
      [],
      ["Mês", "Volume"],
      ...stats.chartData.map((item) => [item.name, item.valor.toFixed(2)]),
      [],
      ["Produto", "Unidades"],
      ...stats.productMix.map((item) => [item.name, item.value]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `indicadores-sicoob-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Business Intelligence SICOOB</h1>
            <p className="text-muted-foreground italic text-sm">Insights baseados em dados para decisões estratégicas de Cooperativismo.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal w-full md:w-[280px]", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>{format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}</>
                    ) : (
                      format(date.from, "dd/MM/yy")
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!stats}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.ticketMedio || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Média por pedido concluído</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
              <Target className="h-4 w-4 text-status-transit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalVolume || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Pedidos concluídos no período</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Qtd. Pedidos</CardTitle>
              <Clock className="h-4 w-4 text-status-production" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orderCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Solicitações processadas</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unidades Entregues</CardTitle>
              <PackageCheck className="h-4 w-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUnits || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Nos pedidos concluídos</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Volume de Pedidos (R$)</CardTitle>
              <CardDescription>Evolução mensal do faturamento consolidado.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                  <Tooltip formatter={(val) => formatCurrency(val as number)} />
                  <Bar dataKey="valor" fill="#003641" radius={[4, 4, 0, 0]}>
                    {(stats?.chartData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === (stats?.chartData?.length || 0) - 1 ? '#7DB61C' : '#003641'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Mix de Produtos</CardTitle>
              <CardDescription>Unidades dos produtos presentes nos pedidos concluídos.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.productMix || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(stats?.productMix || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {(stats?.productMix || []).map((product, i) => (
                  <div key={product.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-medium">{product.name} ({product.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
