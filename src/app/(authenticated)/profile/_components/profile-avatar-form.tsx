"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAvatar } from "../actions";

const BUCKET = "avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileAvatarForm({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Escolha uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("A foto deve ter no máximo 2 MB.");
      return;
    }

    setPending(true);
    setError(null);
    const path = `${userId}/avatar`;
    const supabase = createClient();

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data, error: signedUrlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (signedUrlError) throw signedUrlError;

      const result = await updateProfileAvatar(path);
      if (!result.success) throw new Error(result.error);

      setCurrentUrl(data.signedUrl);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível atualizar a foto.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    setPending(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([`${userId}/avatar`]);
      if (removeError) throw removeError;

      const result = await updateProfileAvatar(null);
      if (!result.success) throw new Error(result.error);

      setCurrentUrl(null);
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Avatar size="lg" className="size-20 bg-primary/15 text-primary">
        {currentUrl && <AvatarImage src={currentUrl} alt={`Foto de ${name}`} />}
        <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-2">
        <div>
          <p className="font-medium">Foto de perfil</p>
          <p className="text-sm text-muted-foreground">
            Use uma imagem de até 2 MB. Ela aparece para sua equipe.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
          disabled={pending}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Camera aria-hidden="true" />
            )}
            {pending ? "Salvando…" : currentUrl ? "Alterar foto" : "Adicionar foto"}
          </Button>
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={handleRemove}
            >
              <Trash2 aria-hidden="true" />
              Remover
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
