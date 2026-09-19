"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { LoadingOverlay } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";

function getFilename(contentDisposition: string | null, fallback: string) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export function CsvDownloadButton({
  href,
  label = "Baixar CSV",
  loadingLabel = "Gerando CSV…",
  fallbackFilename = "jornix-relatorio.csv",
  loadingMessage = "Gerando relatório CSV…",
}: {
  href: string;
  label?: string;
  loadingLabel?: string;
  fallbackFilename?: string;
  loadingMessage?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (isDownloading) return;

    setError(null);
    setIsDownloading(true);

    try {
      const response = await fetch(href, { credentials: "same-origin" });

      if (!response.ok) {
        throw new Error(`Não foi possível gerar ${label.toLocaleLowerCase("pt-BR")}.`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getFilename(
        response.headers.get("content-disposition"),
        fallbackFilename,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : `Não foi possível gerar ${label.toLocaleLowerCase("pt-BR")}.`,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-busy={isDownloading}
      >
        {isDownloading ? (
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {isDownloading ? loadingLabel : label}
      </Button>
      {error && (
        <p role="alert" className="text-right text-xs text-destructive">
          {error}
        </p>
      )}
      {isDownloading && <LoadingOverlay message={loadingMessage} />}
    </div>
  );
}
