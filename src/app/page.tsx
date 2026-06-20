import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen items-center justify-center">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Timesheet App</h1>
        <p className="text-lg text-muted-foreground">
          Fundaçao configurada com sucesso!
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button>botao padrao</Button>
        <Button variant="outline">botao outline</Button>
        <Button variant="destructive">botao destructive</Button>
      </div>
    </main>
  );
}
