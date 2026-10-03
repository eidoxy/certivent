"use client";

import type { ReactNode } from "react";
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { features, type DataTableFeatures } from "@/components/data-table-features";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const HEAD_CLASS = "px-4";
const CELL_CLASS = "px-4 py-3";

type DataTableProps<TData extends RowData> = {
  /** Build with `createColumnHelper<DataTableFeatures, TData>()`. */
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  /** Accessible table name, rendered as a visually hidden `<caption>`. */
  caption: string;
  /** Stable row key. Defaults to the row index. */
  getRowId?: (row: TData) => string;
  /** Replaces the default empty state. Rendered inside a full-width row under the headers. */
  empty?: ReactNode;
};

/**
 * Generic, read-only table on top of TanStack Table v9 and the shadcn `Table`.
 * Loading and error states belong to the caller (see `DataTableSkeleton` for the loading shape).
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  caption,
  getRowId,
  empty,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    columns,
    data,
    ...(getRowId ? { getRowId: (row: TData) => getRowId(row) } : {}),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-xl border">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(HEAD_CLASS, header.column.columnDef.meta?.headClassName)}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(CELL_CLASS, cell.column.columnDef.meta?.cellClassName)}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={table.getAllLeafColumns().length} className="whitespace-normal">
                {empty ?? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>Nothing to show yet.</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Loading placeholder with the same silhouette as `DataTable`: real header labels, skeleton cells.
 * Pass the header labels in column order.
 */
export function DataTableSkeleton({
  headers,
  rows = 5,
  label,
}: {
  headers: string[];
  rows?: number;
  /** Screen reader announcement, for example "Loading events". */
  label: string;
}) {
  return (
    <div aria-busy="true" className="rounded-xl border">
      <p role="status" className="sr-only">
        {label}
      </p>
      <Table aria-hidden="true">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header, i) => (
              <TableHead key={i} className={HEAD_CLASS}>
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              {headers.map((_, j) => (
                <TableCell key={j} className={CELL_CLASS}>
                  <Skeleton className="h-5 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
