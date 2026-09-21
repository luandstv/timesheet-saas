"use client";

import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ActivityDateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextValue: string) {
    if (!nextValue) return;
    router.replace(`${pathname}?activityDate=${encodeURIComponent(nextValue)}`, {
      scroll: false,
    });
  }

  return (
    <div className="grid gap-1.5 sm:min-w-44">
      <Label htmlFor="activity-day">Dia das atividades</Label>
      <Input
        id="activity-day"
        type="date"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
      />
    </div>
  );
}
