import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Endpoint legado desativado.
 *
 * A confirmação de endereço eletrônico pertence exclusivamente ao fluxo
 * assinado e de uso único do Supabase Auth. Um UUID de usuário não comprova
 * posse da caixa de entrada e, portanto, nunca pode confirmar uma conta.
 */
Deno.serve((req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: 'endpoint_desativado',
      message: 'Use o link de confirmação enviado pelo Supabase Auth.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
