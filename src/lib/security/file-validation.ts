import { logger } from "@/lib/logger";

/**
 * Utilitário robusto para validação de arquivos no frontend.
 * Previne ataques de extensão mascarada e arquivos corrompidos.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationOptions {
  maxSizeMb?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

/**
 * Magic Numbers dos formatos permitidos para validação binária.
 * (Assinaturas dos primeiros bytes do arquivo)
 */
const MAGIC_NUMBERS: Record<string, string[]> = {
  "image/jpeg": ["ffd8ff"],
  "image/png": ["89504e47"],
  "image/webp": ["52494646"], // RIFF (seguido por WEBP)
  "application/pdf": ["25504446"], // %PDF
};

function basicValidationError(file: File, options: Required<ValidationOptions>): string | null {
  if (file.size > options.maxSizeMb * 1024 * 1024) return `Arquivo excede o limite de ${options.maxSizeMb}MB.`;
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (!options.allowedExtensions.includes(extension)) return "Extensão de arquivo não permitida.";
  if (!options.allowedMimeTypes.includes(file.type)) return "Tipo de arquivo inválido.";
  return null;
}

async function hasValidSignature(file: File): Promise<boolean> {
  const expected = MAGIC_NUMBERS[file.type];
  if (!expected) return true;
  const signature = await getFileSignature(file);
  const valid = expected.some(candidate => signature.startsWith(candidate));
  if (!valid) logger.error("File signature mismatch detected", { filename: file.name, reportedType: file.type, signature });
  return valid;
}

export async function validateFile(
  file: File,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const {
    maxSizeMb = 5,
    allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
    allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  } = options;

  const basicError = basicValidationError(file, { maxSizeMb, allowedExtensions, allowedMimeTypes });
  if (basicError) return { valid: false, error: basicError };

  // 4. Verificação de Integridade (Magic Numbers)
  // Lê os primeiros 4 bytes do arquivo para confirmar o tipo real
  try {
    if (!(await hasValidSignature(file))) {
      return { valid: false, error: "Conteúdo do arquivo não corresponde à sua extensão (possível arquivo malicioso)." };
    }
  } catch (err) {
    logger.warn("Could not verify file signature", err);
    // Em caso de erro na leitura (ex: browser antigo), permitimos passar, 
    // confiando no RLS do bucket que também valida MIME types.
  }

  return { valid: true };
}

/**
 * Lê os primeiros bytes de um arquivo e retorna em formato Hex.
 */
async function getFileSignature(file: File): Promise<string> {
  const slice = file.slice(0, 4);
  const buffer = await slice.arrayBuffer();
  const view = new Uint8Array(buffer);
  return Array.from(view)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
