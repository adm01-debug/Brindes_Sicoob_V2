// Ponto de entrada da função publicada. Toda a lógica vive em `handler.ts`,
// que NÃO chama `Deno.serve`: `sicoob-kit-quote` importa o handler de lá para
// atender `op: 'price-attestation'` no próprio processo, e um `Deno.serve` no
// módulo importado disputaria o listener padrão com o da hospedeira — os dois
// pontos de entrada deixariam de subir.
import { withStructuredLogging } from '../_shared/structured-logger.ts';
import { handleQuotePriceAttestation } from './handler.ts';

Deno.serve(withStructuredLogging('quote-price-attestation', handleQuotePriceAttestation));
