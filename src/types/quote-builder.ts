
import type { QuoteItem, QuoteItemPersonalization } from "@/hooks/quotes/useQuotes";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  minQuantity?: number;
  totalStock?: number;
  priceUpdatedAt?: string | null;
  priceFreshnessThresholdDays?: number | null;
}

export interface RawProductColor {
  name?: string;
  hex?: string;
  stock?: number;
}

export type DiscountType = "percent" | "amount";
export type DeliveryMode = "prazo" | "data";

export interface QuoteBuilderState {
  clientId: string;
  contactId: string;
  companyInfo: SelectedCompanyInfo | null;
  contactInfo: SelectedContactInfo | null;
  validityDays: string;
  validUntil: string;
  discountType: DiscountType;
  discountValue: number;
  negotiationMarkup: number;
  notes: string;
  internalNotes: string;
  items: QuoteItem[];
  quoteNumber: string;
  currentStatus: string;
  paymentTerms: string;
  deliveryTime: string;
  deliveryMode: DeliveryMode;
  deliveryDate: Date | undefined;
  shippingType: string;
  shippingCost: number;
}
