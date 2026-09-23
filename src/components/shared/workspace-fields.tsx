import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      {label}
      {description && (
        <span className="text-xs font-normal text-muted-foreground">{description}</span>
      )}
      {children}
    </label>
  );
}
export function ManagerField({
  managers,
  current,
}: {
  managers: { id: string; user: { name: string } }[];
  current?: string | null;
}) {
  return (
    <Field label="Gestor responsável">
      <Select name="managerId" defaultValue={current ?? "none"}>
        <SelectTrigger>
          <SelectValue placeholder="Responsável da empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Responsável da empresa</SelectItem>
          {managers.map((manager) => (
            <SelectItem key={manager.id} value={manager.id}>
              {manager.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
export function RoleField({
  value = "COLLABORATOR",
}: {
  value?: "MANAGER" | "COLLABORATOR";
}) {
  return (
    <Field label="Papel">
      <Select name="role" defaultValue={value}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="COLLABORATOR">Colaborador</SelectItem>
          <SelectItem value="MANAGER">Gestor</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
