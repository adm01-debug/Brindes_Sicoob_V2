import { logger } from "@/lib/logger";
import { quoteToOrderService } from "./quoteToOrderService";

export interface ConvertQuoteToOrderParams {
  quoteId: string;
  sellerId: string;
  organizationId?: string | null;
}

export interface ConvertedOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
}

/**
 * Clean Code implementation using Unified Service Layer.
 */
export async function convertQuoteToOrder({ quoteId, sellerId, organizationId }: ConvertQuoteToOrderParams): Promise<ConvertedOrder> {
  try {
    // 1. Fetch the quote
    const quote = await quoteToOrderService.fetchQuote(quoteId);

    if (quote.status !== "approved") {
      throw new Error("Apenas orçamentos aprovados podem ser convertidos em pedidos");
    }

    // 2. Check if order already exists
    const existingOrder = await quoteToOrderService.checkExistingOrder(quoteId);
    if (existingOrder) {
      throw new Error(`Este orçamento já foi convertido no pedido #${existingOrder.order_number}`);
    }

    // 3. Create the order
    const effectiveOrgId = organizationId || quote.organization_id || null;
    const order = await quoteToOrderService.createOrder({
      seller_id: sellerId,
      organization_id: effectiveOrgId,
      quote_id: quoteId,
      client_id: quote.client_id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_company: quote.client_company,
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      shipping_cost: quote.shipping_cost || 0,
      shipping_type: quote.shipping_type,
      total: quote.total,
      payment_terms: quote.payment_terms,
      delivery_time: quote.delivery_time,
      notes: quote.notes,
      internal_notes: quote.internal_notes,
      status: "confirmed",
      fulfillment_status: "unfulfilled",
    });

    // 4. Copy items
    await quoteToOrderService.copyItems(order.id, quoteId, effectiveOrgId);

    // 5. Update quote status
    await quoteToOrderService.updateQuoteStatus(quoteId, "converted");

    return order;
  } catch (error: any) {
    logger.error("Error converting quote to order:", error);
    throw error;
  }
}
