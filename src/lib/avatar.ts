import "server-only";

import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function resolveAvatarUrl(avatarPath: string | null | undefined) {
  if (!avatarPath) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(avatarPath, SIGNED_URL_TTL_SECONDS);

  return error ? null : data.signedUrl;
}
