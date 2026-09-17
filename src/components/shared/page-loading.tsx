import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Placeholder({ className }: { className: string }) {
  return (
    <div className={cn("rounded-lg bg-muted motion-safe:animate-pulse", className)} />
  );
}

export function PageLoading({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-360 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 motion-safe:animate-spin"
          />
          Carregando informações…
        </p>
      </div>

      <div aria-hidden="true" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-4">
                <Placeholder className="h-4 w-2/3" />
                <Placeholder className="h-8 w-1/2" />
                <Placeholder className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-5">
            <Placeholder className="h-5 w-2/5 sm:w-1/4" />
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 border-t border-border pt-4"
              >
                <Placeholder className="size-9 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Placeholder className="h-3 w-2/3 sm:w-1/3" />
                  <Placeholder className="h-3 w-1/2 sm:w-1/4" />
                </div>
                <Placeholder className="h-4 w-12 sm:w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
