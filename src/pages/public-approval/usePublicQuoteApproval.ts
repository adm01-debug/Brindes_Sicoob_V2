/**
 * usePublicQuoteApproval — dados e resposta da aprovação pública de orçamento.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Quote, QuoteItem } from '@/hooks/quotes/quoteTypes';
import { supabase } from '@/integrations/supabase/client';

export interface PublicSeller {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface AlreadyRespondedData {
  response: 'approved' | 'rejected';
  responded_at: string;
  response_notes?: string | null;
  signer_name?: string | null;
  signer_document?: string | null;
  signature_hash?: string | null;
}

export interface QuoteData {
  quote: Quote;
  seller: PublicSeller | null;
  token?: unknown;
}

export interface SignatureReceipt {
  signer_name: string;
  signer_document: string;
  signed_at: string;
  signature_hash: string;
  signer_ip: string;
}

export interface PublicQuoteApprovalState {
  data: QuoteData | null;
  isLoading: boolean;
  error: string | null;
  isExpired: boolean;
  alreadyResponded: AlreadyRespondedData | null;
  responseNotes: string;
  setResponseNotes: (value: string) => void;
  signerName: string;
  setSignerName: (value: string) => void;
  signerDocument: string;
  setSignerDocument: (value: string) => void;
  signatureError: string | null;
  isSubmitting: boolean;
  submitted: string | null;
  signatureReceipt: SignatureReceipt | null;
  handleResponse: (response: 'approved' | 'rejected') => Promise<void>;
}

interface PublicQuoteResult extends Partial<QuoteData>, Partial<AlreadyRespondedData> {
  error?: string;
  expired?: boolean;
  already_responded?: boolean;
  signature?: SignatureReceipt;
}

function formatDocument(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

async function invokePublicQuote(body: Record<string, unknown>) {
  const response = await supabase.functions.invoke('quote-public-view', { body });
  if (response.error && !response.data) throw new Error(response.error.message);
  return response.data as PublicQuoteResult;
}

function usePublicQuoteData(token?: string) {
  const [data, setData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState<AlreadyRespondedData | null>(null);
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await invokePublicQuote({ action: 'get_quote', token });
        if (result.error) {
          if (result.expired) setIsExpired(true);
          else setError(result.error);
        } else if (result.already_responded) {
          setAlreadyResponded(result as AlreadyRespondedData);
        } else {
          setData(result as QuoteData);
        }
      } catch (caught) {
        setError('Erro ao carregar proposta');
        console.error(caught);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [token]);
  return { data, isLoading, error, isExpired, alreadyResponded };
}

function useSignatureForm() {
  const [responseNotes, setResponseNotes] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerDocument, setSignerDocumentRaw] = useState('');
  const setSignerDocument = useCallback((value: string) => {
    setSignerDocumentRaw(formatDocument(value));
  }, []);
  return {
    responseNotes,
    setResponseNotes,
    signerName,
    setSignerName,
    signerDocument,
    setSignerDocument,
  };
}

function validateSignature(response: string, signerName: string, signerDocument: string) {
  if (response !== 'approved') return null;
  if (signerName.trim().length < 3) {
    return 'Informe seu nome completo para assinar a aprovação.';
  }
  const length = signerDocument.replace(/\D/g, '').length;
  if (length !== 11 && length !== 14) {
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
  }
  return null;
}

interface ResponsePayloadParams {
  token: string;
  response: 'approved' | 'rejected';
  responseNotes: string;
  signerName: string;
  signerDocument: string;
}

function responsePayload({
  token,
  response,
  responseNotes,
  signerName,
  signerDocument,
}: ResponsePayloadParams) {
  const approved = response === 'approved';
  return {
    action: 'respond',
    token,
    response,
    response_notes: responseNotes.trim() || null,
    signer_name: approved ? signerName.trim() : undefined,
    signer_document: approved ? signerDocument.replace(/\D/g, '') : undefined,
  };
}

function useQuoteResponse(token: string | undefined, form: ReturnType<typeof useSignatureForm>) {
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [signatureReceipt, setSignatureReceipt] = useState<SignatureReceipt | null>(null);
  const handleResponse = useCallback(
    async (response: 'approved' | 'rejected') => {
      if (!token) return;
      setSignatureError(null);
      const validationError = validateSignature(response, form.signerName, form.signerDocument);
      if (validationError) {
        setSignatureError(validationError);
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await invokePublicQuote(
          responsePayload({
            token,
            response,
            responseNotes: form.responseNotes,
            signerName: form.signerName,
            signerDocument: form.signerDocument,
          }),
        );
        if (result.error) throw new Error(result.error);
        if (result.signature) setSignatureReceipt(result.signature);
        setSubmitted(response);
      } catch (caught) {
        setSignatureError(caught instanceof Error ? caught.message : 'Erro ao enviar resposta');
        console.error(caught);
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, form],
  );
  return { signatureError, isSubmitting, submitted, signatureReceipt, handleResponse };
}

export function usePublicQuoteApproval(token?: string): PublicQuoteApprovalState {
  const quoteData = usePublicQuoteData(token);
  const form = useSignatureForm();
  const response = useQuoteResponse(token, form);
  return { ...quoteData, ...form, ...response };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function calcPersonalizationTotal(item: QuoteItem) {
  return (item.personalizations || []).reduce(
    (sum, personalization) => sum + (personalization.total_cost || 0),
    0,
  );
}
