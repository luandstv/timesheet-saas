import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import link from "next/link";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Clock } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Jornix | Timesheet App</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda sem conta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Criar Conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
