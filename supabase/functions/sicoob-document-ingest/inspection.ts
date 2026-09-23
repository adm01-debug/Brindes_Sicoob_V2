export type DocumentPurpose = 'invoice_pdf' | 'invoice_xml' | 'delivery_proof';

export interface InspectionResult {
  mime: 'application/pdf' | 'application/xml' | 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'pdf' | 'xml' | 'jpg' | 'png' | 'webp';
}

export class DocumentInspectionError extends Error {}

const decoder = new TextDecoder('utf-8', { fatal: false });
const ascii = (bytes: Uint8Array) => decoder.decode(bytes);
const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);

function inspectPdf(bytes: Uint8Array): InspectionResult {
  if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new DocumentInspectionError('Assinatura PDF inválida.');
  const text = ascii(bytes);
  if (!text.includes('%%EOF')) throw new DocumentInspectionError('PDF truncado ou sem marcador final.');
  if (/\/(JavaScript|JS|OpenAction|Launch|EmbeddedFile)\b/i.test(text)) {
    throw new DocumentInspectionError('PDF com conteúdo ativo ou anexo incorporado não é permitido.');
  }
  return { mime: 'application/pdf', extension: 'pdf' };
}

function inspectXml(bytes: Uint8Array): InspectionResult {
  const text = ascii(bytes).replace(/^\uFEFF/, '').trim();
  if (!text.startsWith('<') || /<!DOCTYPE|<!ENTITY/i.test(text)) {
    throw new DocumentInspectionError('XML inválido ou com entidade externa proibida.');
  }
  if (!/<(?:nfeProc|NFe|procEventoNFe|evento|inutNFe)(?:\s|>)/i.test(text)) {
    throw new DocumentInspectionError('O XML não possui uma raiz fiscal reconhecida.');
  }
  return { mime: 'application/xml', extension: 'xml' };
}

function inspectImage(bytes: Uint8Array): InspectionResult {
  if (startsWith(bytes, [0xff, 0xd8, 0xff]) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    const tail = bytes.slice(Math.max(0, bytes.length - 16));
    if (!ascii(tail).includes('IEND')) throw new DocumentInspectionError('PNG truncado ou sem bloco final.');
    return { mime: 'image/png', extension: 'png' };
  }
  if (bytes.length >= 12 && ascii(bytes.slice(0, 4)) === 'RIFF' && ascii(bytes.slice(8, 12)) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  throw new DocumentInspectionError('Assinatura da imagem não corresponde a JPEG, PNG ou WebP.');
}

export function inspectDocumentBytes(bytes: Uint8Array, purpose: DocumentPurpose): InspectionResult {
  if (bytes.length === 0) throw new DocumentInspectionError('Arquivo vazio.');
  if (purpose === 'invoice_pdf') return inspectPdf(bytes);
  if (purpose === 'invoice_xml') return inspectXml(bytes);
  return inspectImage(bytes);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
