
import { supabase } from "@/integrations/supabase/client";
import { createPrivateStorageUrl } from '@/lib/private-storage';

/**
 * Storage Resilience Helper
 * Implements automatic fallback between primary and secondary buckets.
 */

const PRIMARY_BUCKET = 'personalization-images';
const SECONDARY_BUCKET = 'personalization-images-secondary';

export async function resilientUpload(filePath: string, file: File) {
  try {
    // Try Primary
    const { data, error } = await supabase.storage
      .from(PRIMARY_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.warn(`[storage] Primary bucket upload failed, trying secondary: ${error.message}`);
      return await fallbackUpload(filePath, file);
    }
    return data;
  } catch {
    console.warn(`[storage] Critical error in primary, trying secondary...`);
    return await fallbackUpload(filePath, file);
  }
}

async function fallbackUpload(filePath: string, file: File) {
  const { data, error } = await supabase.storage
    .from(SECONDARY_BUCKET)
    .upload(filePath, file, { upsert: true });

  if (error) throw error;
  return data;
}

export async function getResilientUrl(path: string) {
  return createPrivateStorageUrl(PRIMARY_BUCKET, path);
}
