"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import type { ReportRow } from "@/services/report.service";
import { Button } from "@/components/ui/button";
import { formatReportDateToDisplay } from "@/lib/reports/report-helpers";
import { formatMinutesToCompact } from "@/lib/format";
import { getStatusBadgeMeta } from "@/lib/badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ReportTableProps = {
  rows: ReportRow[];
};

export function ReportTable({ rows }: ReportTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ReportRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className="-ml-3"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Data
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => formatReportDateToDisplay(row.original.date),
      },
      {
        accessorKey: "dayType",
        header: "Tipo do dia",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const { label, className } = getStatusBadgeMeta(row.original.status);
          return <Badge className={className}>{label}</Badge>;
        },
      },
      {
        accessorKey: "totalWorkedMinutes",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className="-ml-3"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Total trabalhado
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) =>
          formatMinutesToCompact(row.original.totalWorkedMinutes),
      },
      {
        accessorKey: "normalMinutes",
        header: "Horas normais",
        cell: ({ row }) => formatMinutesToCompact(row.original.normalMinutes),
      },
      {
        accessorKey: "overtime75FhcMinutes",
        header: "Horas extras 75% FHC",
        cell: ({ row }) =>
          formatMinutesToCompact(row.original.overtime75FhcMinutes),
      },
      {
        accessorKey: "overtime75FhcnMinutes",
        header: "Horas extras 75% FHCN",
        cell: ({ row }) =>
          formatMinutesToCompact(row.original.overtime75FhcnMinutes),
      },
      {
        accessorKey: "overtime100FhcMinutes",
        header: "Horas extras 100% FHC",
        cell: ({ row }) =>
          formatMinutesToCompact(row.original.overtime100FhcMinutes),
      },
      {
        accessorKey: "overtime100FhcnMinutes",
        header: "Horas extras 100% FHCN",
        cell: ({ row }) =>
          formatMinutesToCompact(row.original.overtime100FhcnMinutes),
      },
    ],
    [],
  );

  // TanStack Table exposes a mutable instance API that React Compiler cannot
  // safely memoize. The library owns this stateful object and its usage here
  // is intentional, so keep the compiler warning scoped to this call.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">Detalhamento diário</h2>
        <p className="text-sm text-muted-foreground">
          Visualize os registros consolidados por dia no período selecionado.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/40 [&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="[&_tr:last-child]:border-0">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center align-middle text-muted-foreground"
                  >
                    Nenhum registro encontrado para o período selecionado.{" "}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
