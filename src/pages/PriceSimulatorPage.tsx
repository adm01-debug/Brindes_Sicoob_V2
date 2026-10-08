// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { ProductPriceSimulator } from '@/components/pricing/ProductPriceSimulator';
import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  BarChart3,
} from 'lucide-react';

export default function PriceSimulatorPage() {
  return (
    <>
      <PageSEO title="Simulador de Preços" description="Simule preços de brindes com personalização, quantidades e custos." path="/simulador-precos" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Hero Header — #1 */}
        <div className="flex flex-col gap-1">
          <h1 data-testid="page-title-simulador-precos" className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Simulador de Preços
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Calcule o preço exato de qualquer produto com personalização, compare técnicas e gere orçamentos em segundos.
          </p>
        </div>

        {/* Tabs com contexto — #2 */}
        <Tabs defaultValue="by-product" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-2 h-auto p-1">
            <TabsTrigger value="by-product" className="gap-2 py-2.5 data-[state=active]:shadow-md">
              <Package className="w-4 h-4" />
              <div className="flex flex-col items-start text-left">
                <span className="text-xs sm:text-sm font-medium">Por Produto</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block font-normal">Configure e veja o preço final</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="by-quantity" className="gap-2 py-2.5 data-[state=active]:shadow-md">
              <BarChart3 className="w-4 h-4" />
              <div className="flex flex-col items-start text-left">
                <span className="text-xs sm:text-sm font-medium">Por Tiragem</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block font-normal">Compare preços em diferentes quantidades</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-product" className="mt-6 animate-fade-in">
            <ProductPriceSimulator />
          </TabsContent>

          <TabsContent value="by-quantity" className="mt-6 animate-fade-in">
            <QuantityPriceCalculator 
              productBasePrice={0}
              onSelectTechnique={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
