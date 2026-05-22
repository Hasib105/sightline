"use client";

import { usePathname } from "next/navigation";
import {
  Children,
  cloneElement,
  isValidElement,
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Input } from "@/components/ui/input";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { cn } from "@/lib/utils";

const tableClass = "w-full min-w-0 border-separate border-spacing-0 text-left text-[13px] text-[var(--dashboard-text-soft)]";
type TableChrome = "full" | "compact" | "bare";

type SortState = {
  columnIndex: number | null;
  direction: "asc" | "desc";
};

type TableElementProps = {
  children?: ReactNode;
  className?: string;
  onClick?: (event: unknown) => void;
};

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeText).join(" ");
  }
  if (isValidElement<TableElementProps>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

function elementChildren(element: ReactElement<TableElementProps>): ReactNode[] {
  return Children.toArray(element.props.children);
}

function extractTableParts(children: ReactNode) {
  const tableChildren = Children.toArray(children).filter(isValidElement) as ReactElement<TableElementProps>[];
  const head = tableChildren.find((child) => child.type === "thead");
  const body = tableChildren.find((child) => child.type === "tbody");
  const headerRow = head
    ? (elementChildren(head).find(isValidElement) as ReactElement<TableElementProps> | undefined)
    : undefined;
  const headerCells = headerRow
    ? (elementChildren(headerRow).filter(isValidElement) as ReactElement<TableElementProps>[])
    : [];
  const bodyRows = body
    ? (elementChildren(body).filter(isValidElement) as ReactElement<TableElementProps>[])
    : [];

  return {
    head,
    body,
    headerRow,
    headerCells,
    bodyRows,
    labels: headerCells.map((cell) => nodeText(cell.props.children).trim() || "Column"),
  };
}

function rowCells(row: ReactElement<TableElementProps>) {
  return elementChildren(row).filter(isValidElement) as ReactElement<TableElementProps>[];
}

function compareCellText(left: string, right: string): number {
  const leftNumber = Number(left.replace(/,/g, "").trim());
  const rightNumber = Number(right.replace(/,/g, "").trim());
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function sortRows(rows: ReactElement<TableElementProps>[], sortState: SortState) {
  if (sortState.columnIndex === null) {
    return rows;
  }

  const sorted = [...rows].sort((left, right) => {
    const leftValue = nodeText(rowCells(left)[sortState.columnIndex ?? 0]?.props.children).trim();
    const rightValue = nodeText(rowCells(right)[sortState.columnIndex ?? 0]?.props.children).trim();
    return compareCellText(leftValue, rightValue);
  });

  return sortState.direction === "asc" ? sorted : sorted.reverse();
}

function TableEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-5 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function EnhancedDataTable({
  children,
  className,
  containerClassName,
  storageKey,
  searchPlaceholder = "Search table...",
  pageSizeOptions = [10, 25, 50],
  chrome = "full",
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  storageKey?: string;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  chrome?: TableChrome;
}) {
  const pathname = usePathname();
  const reactId = useId().replaceAll(":", "");
  const derivedStorageKey = storageKey ?? `sightline:${pathname}:table:${reactId}`;
  const defaultPageSize = pageSizeOptions[0] ?? 10;
  const [searchQuery, setSearchQuery] = useLocalStorageState(`${derivedStorageKey}:search`, "");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeView, setActiveView] = useLocalStorageState<"list" | "grid">(
    `${derivedStorageKey}:view`,
    "list"
  );
  const [pageSize, setPageSize] = useLocalStorageState<number>(
    `${derivedStorageKey}:page-size`,
    defaultPageSize
  );
  const [sortState, setSortState] = useLocalStorageState<SortState>(
    `${derivedStorageKey}:sort`,
    { columnIndex: null, direction: "asc" }
  );
  const [currentPage, setCurrentPage] = useState(1);
  const parts = useMemo(() => extractTableParts(children), [children]);
  const controlsEnabled = chrome === "full";
  const compactControls = chrome === "compact";
  const paginate = chrome !== "bare";
  const effectiveView = controlsEnabled ? activeView : "list";
  const searchableQuery = controlsEnabled ? deferredSearchQuery.trim().toLowerCase() : "";

  const filteredRows = useMemo(() => {
    const rows = parts.bodyRows.filter((row) => {
      if (!searchableQuery) {
        return true;
      }
      return nodeText(row.props.children).toLowerCase().includes(searchableQuery);
    });
    return sortRows(rows, sortState);
  }, [parts.bodyRows, searchableQuery, sortState]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = paginate
    ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredRows;

  useEffect(() => {
    if (currentPage > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clamp page after filtering/pagination changes.
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!pageSizeOptions.includes(pageSize)) {
      setPageSize(defaultPageSize);
    }
  }, [defaultPageSize, pageSize, pageSizeOptions, setPageSize]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches &&
      window.localStorage.getItem(`${derivedStorageKey}:view`) === null
    ) {
      setActiveView("grid");
    }
  }, [derivedStorageKey, setActiveView]);

  if (!parts.head || !parts.body || !parts.headerRow || parts.headerCells.length === 0) {
    return (
      <div className={cn("overflow-auto rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)]", containerClassName)}>
        <table className={cn(tableClass, className)}>{children}</table>
      </div>
    );
  }

  function cycleSort(columnIndex: number) {
    setSortState((current) => {
      if (current.columnIndex === columnIndex) {
        return {
          columnIndex,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { columnIndex, direction: "asc" };
    });
  }

  function resetControls() {
    setSearchQuery("");
    setSortState({ columnIndex: null, direction: "asc" });
    setCurrentPage(1);
    setActiveView("list");
    setPageSize(defaultPageSize);
  }

  const paginationStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const paginationEnd = Math.min(currentPage * pageSize, filteredRows.length);
  const paginationBar = paginate ? (
    <div
      className={cn(
        "flex flex-col gap-3 border-y border-[var(--brand-border-soft)] py-3 md:flex-row md:items-center md:justify-between",
        compactControls && "border-b-0 py-2"
      )}
    >
      <div className="text-sm text-muted-foreground">
        Showing {paginationStart}-{paginationEnd} of {filteredRows.length} items
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {controlsEnabled ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows
            <DashboardSelect
              triggerClassName="w-[5rem]"
              name={`${derivedStorageKey}:page-size`}
              value={String(pageSize)}
              onValueChange={(nextValue) => {
                setPageSize(Number(nextValue));
                setCurrentPage(1);
              }}
              options={pageSizeOptions.map((option) => ({
                value: String(option),
                label: option,
              }))}
            />
          </label>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="rounded-md border border-[var(--brand-border-soft)] px-2.5 py-1 text-sm">
          Page {currentPage} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  ) : null;

  const enhancedHeaderCells = parts.headerCells.map((cell, columnIndex) =>
    cloneElement(cell, {
      ...cell.props,
      children: (
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => cycleSort(columnIndex)}
        >
          <span>{cell.props.children}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
      ),
    })
  );
  const enhancedHeaderRow = cloneElement(parts.headerRow, {
    ...parts.headerRow.props,
    children: enhancedHeaderCells,
  });
  const enhancedHead = cloneElement(parts.head, {
    ...parts.head.props,
    children: enhancedHeaderRow,
  });
  const enhancedBody = cloneElement(parts.body, {
    ...parts.body.props,
    children: paginatedRows,
  });

  return (
    <div className={cn("dashboard-data-table", chrome === "full" ? "space-y-4" : "space-y-2")}>
      {controlsEnabled ? (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
            value={searchQuery}
            name={`${derivedStorageKey}:search`}
              onChange={(event) =>
                startTransition(() => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                })
              }
              placeholder={searchPlaceholder}
              className="dashboard-data-table__search h-9 rounded-md bg-card pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetControls}>
              <SlidersHorizontal className="size-4" />
              Reset
            </Button>
            <div className="flex items-center rounded-md border border-[var(--brand-border-soft)] bg-card p-0.5">
              <Button
                variant={activeView === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("list")}
                title="Switch to list view"
              >
                <List className="size-4" />
                List
              </Button>
              <Button
                variant={activeView === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("grid")}
                title="Switch to grid view"
              >
                <LayoutGrid className="size-4" />
                Grid
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {controlsEnabled ? paginationBar : null}

      {filteredRows.length === 0 ? (
        <TableEmptyState
          title={parts.bodyRows.length === 0 ? "No rows" : "No matching rows"}
          description={
            parts.bodyRows.length === 0
              ? "Rows will appear here when data is available."
              : "Try a different search query or reset the table controls."
          }
        />
      ) : effectiveView === "list" ? (
        <div className={cn("dashboard-table-wrapper overflow-auto rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)]", containerClassName)}>
          <table className={cn(tableClass, className)}>
            {enhancedHead}
            {enhancedBody}
          </table>
        </div>
      ) : (
        <div className="dashboard-data-table__grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedRows.map((row, rowIndex) => {
            const cells = rowCells(row);
            return (
              <div
                key={row.key ?? rowIndex}
                className="dashboard-data-table__card rounded-md border border-[var(--brand-border-soft)] bg-card p-3"
                role={row.props.onClick ? "button" : undefined}
                tabIndex={row.props.onClick ? 0 : undefined}
                onClick={(event) => row.props.onClick?.(event)}
                onKeyDown={(event) => {
                  if (row.props.onClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    row.props.onClick(event);
                  }
                }}
              >
                <div className="space-y-3">
                  {cells.map((cell, cellIndex) => (
                    <div key={cell.key ?? cellIndex} className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {parts.labels[cellIndex] ?? `Column ${cellIndex + 1}`}
                      </div>
                      <div className="min-w-0 text-sm text-foreground">{cell.props.children}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {controlsEnabled || (compactControls && totalPages > 1) ? paginationBar : null}
    </div>
  );
}
