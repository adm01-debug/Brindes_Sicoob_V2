import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddSicoobInvoiceInput {
  invoice_number: string;
  file_path: string;
  file_type: 'pdf' | 'xml';
  amount?: number | null;
  access_key?: string | null;
  issued_at?: string | null;
}

export const useOrderInvoices = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["order-invoices", orderId],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("sicoob_order_invoices")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;

      return Promise.all((data || []).map(async invoice => {
        const { data: signed, error: signedError } = await supabase.storage
          .from('sicoob-order-documents')
          .createSignedUrl(invoice.file_path, 300);
        if (signedError) throw signedError;
        return { ...invoice, file_url: signed.signedUrl };
      }));
    },
    enabled: !!orderId,
  });

  const addInvoice = useMutation({
    mutationFn: async (values: AddSicoobInvoiceInput) => {
      const { data, error: mutationError } = await supabase.rpc('add_sicoob_order_invoice', {
        p_order_id: orderId!,
        p_invoice_number: values.invoice_number,
        p_file_type: values.file_type,
        p_file_path: values.file_path,
        p_amount: values.amount ?? null,
        p_access_key: values.access_key ?? null,
        p_issued_at: values.issued_at ?? null,
      });
      if (mutationError) throw mutationError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Nota fiscal adicionada");
    },
    onError: async (_mutationError, values) => {
      await supabase.storage.from('sicoob-order-documents').remove([values.file_path]);
      toast.error('Não foi possível vincular a nota fiscal ao pedido.');
    },
  });

  const uploadFile = async (file: File) => {
    const allowedTypes = ['application/pdf', 'text/xml', 'application/xml'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xml')) {
      throw new Error("Tipo de arquivo não permitido. Apenas PDF e XML.");
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande. Máximo 10MB.");

    if (!orderId) throw new Error('Pedido não identificado.');
    const extension = file.name.toLowerCase().endsWith('.xml') ? 'xml' : 'pdf';
    const fileName = `${orderId}/invoices/${crypto.randomUUID()}.${extension}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('sicoob-order-documents')
        .upload(fileName, file, {
          upsert: false,
          cacheControl: '3600'
        });
      
      if (error) {
        if (error.message.includes('already exists')) {
          throw new Error("Arquivo já existe no servidor.");
        }
        throw error;
      }
      
      return data.path;
    } catch (err: any) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  return { invoices, isLoading, error, addInvoice, uploadFile };
};
