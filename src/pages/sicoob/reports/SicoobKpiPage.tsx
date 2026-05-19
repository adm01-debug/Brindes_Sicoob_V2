import React, { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Clock, Target, AlertTriangle, Download, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { format, subMonths } from "date-fns";
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
      const { data: orders } = await supabase
        .from("sicoob_orders")
        .select("total_amount, status, created_at")
        .gte("created_at", date?.from?.toISOString() || subMonths(new Date(), 6).toISOString())
        .lte("created_at", date?.to?.toISOString() || new Date().toISOString());

      const total = orders?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;
      const count = orders?.length || 0;
      const avg = count > 0 ? total / count : 0;

      // Group by month for chart
      const monthlyData: Record<string, number> = {};
      orders?.forEach(o => {
        const monthStr = format(new Date(o.created_at), "MMM", { locale: ptBR });
        monthlyData[monthStr] = (monthlyData[monthStr] || 0) + (o.total_amount || 0);
      });

      const chartData = Object.entries(monthlyData).map(([name, valor]) => ({ name, valor }));

      return {
        ticketMedio: avg,
        totalVolume: total,
        orderCount: count,
        chartData
      };
    }
  });

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
            <Button variant="outline" className="gap-2">
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
              <p className="text-xs text-muted-foreground mt-1">Média por pedido</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
              <Target className="h-4 w-4 text-status-transit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalVolume || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Faturamento no período</p>
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
              <CardTitle className="text-sm font-medium">Itens em Falta</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">3</div>
              <p className="text-xs text-destructive/80 mt-1 font-medium">Requer reposição</p>
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
              <CardDescription>Distribuição de pedidos por categoria principal.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Mochilas", value: 35 },
                      { name: "Escritório", value: 25 },
                      { name: "Eletrônicos", value: 20 },
                      { name: "Vestuário", value: 20 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[1, 2, 3, 4].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {["Mochilas", "Escritório", "Eletrônicos", "Vestuário"].map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs font-medium">{cat}</span>
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
