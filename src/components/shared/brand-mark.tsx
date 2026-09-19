import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/jornix/jornix-icon.png"
      alt=""
      width={1254}
      height={1254}
      aria-hidden="true"
      className={cn("h-8 w-7 shrink-0 object-contain", className)}
    />
  );
}

type BrandLogoProps = {
  className?: string;
  /** Use the high-contrast light lettering on a permanently dark surface. */
  darkSurface?: boolean;
};

export function BrandLogo({ className, darkSurface = false }: BrandLogoProps) {
  const shared = cn("h-auto w-36 object-contain", className);

  if (darkSurface) {
    return (
      <Image
        src="/jornix/jornix-logo-custom-dark.png"
        alt="Jornix"
        width={1983}
        height={793}
        className={shared}
        priority
      />
    );
  }

  return (
    <>
      <Image
        src="/jornix/jornix-logo-custom-light.png"
        alt="Jornix"
        width={1983}
        height={793}
        className={cn(shared, "block dark:hidden")}
        priority
      />
      <Image
        src="/jornix/jornix-logo-custom-dark.png"
        alt="Jornix"
        width={1983}
        height={793}
        className={cn(shared, "hidden dark:block")}
        priority
      />
    </>
  );
}
