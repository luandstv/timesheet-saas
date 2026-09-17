import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnCallPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sobreaviso</h1>
        <p className="mt-2 text-muted-foreground">
          Planejamento e acompanhamento dos seus períodos de disponibilidade.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CalendarDays className="size-6 text-accent-foreground" />
          <CardTitle>Planejamento mensal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TODO(JORNIX-UI-01): integrar cadastro, cálculo e consulta de períodos de sobreaviso. */}
          <Badge
            variant="outline"
            className="border-primary/30 bg-accent text-accent-foreground"
          >
            Mock temporário · TODO
          </Badge>
          <p className="text-4xl font-bold">0 dias</p>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            Este número é demonstrativo. O cadastro de períodos e os totais reais de
            sobreaviso ainda serão implementados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
