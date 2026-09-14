import { z } from "zod";
import { DateTime } from "luxon";

import { TIMEZONE } from "@/lib/constants";

function parseReportDate(value: string) {
  return DateTime.fromISO(value, {
    zone: TIMEZONE,
  });
}

export const reportQuerySchema = z
  .object({
    startDate: z.string().min(1, "Data inicial é obrigatoria"),
    endDate: z.string().min(1, "Data final é obrigatoria"),
  })
  .superRefine((data, ctx) => {
    const start = parseReportDate(data.startDate);
    const end = parseReportDate(data.endDate);

    if (!start.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Data inicial inválida",
      });
    }

    if (!end.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Data final inválida",
      });
    }

    if (!start.isValid || !end.isValid) {
      return;
    }

    if (start.toMillis() > end.toMillis()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["StartDate"],
        message: "A data inicial não pode ser maior que a data final",
      });
    }
  });

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
