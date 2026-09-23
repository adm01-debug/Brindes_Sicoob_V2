import { supabase } from '@/integrations/supabase/client';

export type SicoobDocumentPurpose = 'invoice_pdf' | 'invoice_xml' | 'delivery_proof';

interface IngestedDocument {
  documentId: string;
  path: string;
  sha256: string;
  detectedMime: string;
}

export const sicoobDocumentIngestService = {
  async ingest(orderId: string, purpose: SicoobDocumentPurpose, file: File): Promise<IngestedDocument> {
    const form = new FormData();
    form.append('orderId', orderId);
    form.append('purpose', purpose);
    form.append('file', file, file.name);

    const { data, error } = await supabase.functions.invoke('sicoob-document-ingest', { body: form });
    if (error) throw error;
    if (!data || typeof data.path !== 'string' || typeof data.documentId !== 'string') {
      throw new Error('O verificador não retornou a identidade do documento.');
    }
    return data as IngestedDocument;
  },
};
