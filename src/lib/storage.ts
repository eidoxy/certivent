// Server only: Supabase Storage wrapper (service-role key). Never import from a "use client" file.
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const bucket = () => supabase.storage.from(env.SUPABASE_CERT_BUCKET);

export async function uploadObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await bucket().upload(key, bytes, { contentType, upsert: false });
  if (error) throw error;
}

/** Best-effort delete: logs failures and never throws. */
export async function removeObject(key: string): Promise<void> {
  const { error } = await bucket().remove([key]);
  if (error) console.error("storage.remove failed", key, error.message);
}

/** 60-second signed URL that downloads the object under `downloadName`. */
export async function createDownloadUrl(key: string, downloadName: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(key, 60, { download: downloadName });
  if (error || !data) throw error ?? new Error("signed URL failed");
  return data.signedUrl;
}
