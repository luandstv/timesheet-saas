"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Must remain inside a Next Link so pending follows the actual navigation.
export function NavigationIcon({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending ? (
        <LoaderCircle aria-hidden="true" className={cn(className, "motion-safe:animate-spin")} />
      ) : (
        <Icon aria-hidden="true" className={className} />
      )}
      <span role="status" className="sr-only">
        {pending ? `Carregando ${label}…` : ""}
      </span>
    </>
  );
}
