import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell tabs={null}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
