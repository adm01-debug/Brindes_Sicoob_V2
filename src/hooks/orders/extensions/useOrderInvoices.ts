import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrderService } from "@/services/OrderService";
import { toast } from "sonner";

export const useOrderInvoices = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["order-invoices", orderId],
    queryFn: () => OrderService.listInvoices(orderId!),
    enabled: !!orderId,
  });

  const addInvoice = useMutation({
    mutationFn: (values: any) => OrderService.addInvoice(orderId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Nota fiscal adicionada");
    },
  });

  const uploadFile = async (file: File, path: string) => {
    const allowedTypes = ['application/pdf', 'text/xml', 'application/xml'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xml')) {
      throw new Error("Tipo de arquivo não permitido. Apenas PDF e XML.");
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande. Máximo 10MB.");

    const fileName = `${orderId}/${path}`;
    
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('order-documents')
        .list(`${orderId}`);
      
      if (listError) throw listError;

      const isDuplicate = existingFiles?.some(f => f.name === path);
      if (isDuplicate) {
        throw new Error("Arquivo já existe. Por favor, renomeie o arquivo ou remova o anterior.");
      }

      const { data, error } = await supabase.storage
        .from('order-documents')
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
      
      const { data: { publicUrl } } = supabase.storage
        .from('order-documents')
        .getPublicUrl(data.path);
        
      return publicUrl;
    } catch (err: any) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  return { invoices, isLoading, addInvoice, uploadFile };
};
