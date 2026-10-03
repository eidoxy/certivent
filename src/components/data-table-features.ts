import { tableFeatures } from "@tanstack/react-table";

/**
 * Shared TanStack Table v9 feature set for every Certivent data table.
 *
 * Core only: no sorting, filtering or pagination (the admin APIs cap lists at 100 rows).
 * Register more features here (for example `rowSortingFeature` plus `createSortedRowModel()`)
 * and every table built on `DataTable` picks them up.
 *
 * `columnMeta` is a type-only slot: columns may set `meta.headClassName` / `meta.cellClassName`
 * (for example `"text-right"` on numeric columns) and `DataTable` applies them to the cells.
 */
export const features = tableFeatures({
  columnMeta: {} as { headClassName?: string; cellClassName?: string },
});

/** Pass as the first generic argument to `createColumnHelper`, `ColumnDef`, `Row`, and so on. */
export type DataTableFeatures = typeof features;
