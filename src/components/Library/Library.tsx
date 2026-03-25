import { useState, useMemo, useCallback } from "react";
import type { LibraryFile } from "../../hooks/useLibrary";

export interface LibraryProps {
  files: LibraryFile[];
  onFileSelect: (path: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

type SortKey = "title" | "path" | "lastEdited" | "created";
type SortDirection = "asc" | "desc";

interface SortSpec {
  key: SortKey;
  direction: SortDirection;
}

const columns: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "path", label: "Path" },
  { key: "lastEdited", label: "Last Edited" },
  { key: "created", label: "Created" },
];

function compareFn(a: LibraryFile, b: LibraryFile, key: SortKey, direction: SortDirection): number {
  let result: number;

  switch (key) {
    case "title":
      result = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      break;
    case "path":
      result = a.path.toLowerCase().localeCompare(b.path.toLowerCase());
      break;
    case "lastEdited":
      result = new Date(a.lastEdited).getTime() - new Date(b.lastEdited).getTime();
      break;
    case "created":
      result = new Date(a.created).getTime() - new Date(b.created).getTime();
      break;
    default:
      result = 0;
  }

  return direction === "desc" ? -result : result;
}

function SortArrow({ direction }: { direction: SortDirection }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        marginLeft: "var(--space-1)",
        fontSize: "0.7em",
      }}
    >
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function Library({ files, onFileSelect, filter }: LibraryProps) {
  const [sorts, setSorts] = useState<SortSpec[]>([
    { key: "lastEdited", direction: "desc" },
  ]);

  const handleHeaderClick = useCallback(
    (key: SortKey, shiftKey: boolean) => {
      setSorts((prev) => {
        if (shiftKey) {
          // Shift-click: add as secondary sort or toggle existing
          const existingIndex = prev.findIndex((s) => s.key === key);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              key,
              direction: prev[existingIndex].direction === "asc" ? "desc" : "asc",
            };
            return updated;
          }
          return [...prev, { key, direction: key === "lastEdited" || key === "created" ? "desc" : "asc" }];
        }

        // Regular click: set as sole sort, or toggle direction
        const existing = prev.length === 1 ? prev[0] : null;
        if (existing && existing.key === key) {
          return [{ key, direction: existing.direction === "asc" ? "desc" : "asc" }];
        }
        return [{ key, direction: key === "lastEdited" || key === "created" ? "desc" : "asc" }];
      });
    },
    [],
  );

  const filteredAndSorted = useMemo(() => {
    let result = files;

    // Filter
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(lowerFilter) ||
          f.path.toLowerCase().includes(lowerFilter),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      for (const spec of sorts) {
        const cmp = compareFn(a, b, spec.key, spec.direction);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    return result;
  }, [files, filter, sorts]);

  const getSortSpec = (key: SortKey): SortSpec | undefined =>
    sorts.find((s) => s.key === key);

  return (
    <div
      data-testid="library-panel"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <table
        data-testid="library-table"
        role="grid"
        aria-label="Markdown files library"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              fontWeight: "var(--font-weight-semibold)" as unknown as number,
            }}
          >
            {columns.map((col) => {
              const sortSpec = getSortSpec(col.key);
              return (
                <th
                  key={col.key}
                  data-testid={`library-header-${col.key}`}
                  role="columnheader"
                  tabIndex={0}
                  aria-sort={
                    sortSpec
                      ? sortSpec.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  onClick={(e) => handleHeaderClick(col.key, e.shiftKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleHeaderClick(col.key, e.shiftKey);
                    }
                  }}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    textAlign: "left",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    whiteSpace: "nowrap",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {col.label}
                  {sortSpec && <SortArrow direction={sortSpec.direction} />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((file, index) => (
            <tr
              key={file.path}
              data-testid="library-row"
              role="row"
              tabIndex={0}
              onClick={() => onFileSelect(file.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFileSelect(file.path);
                }
              }}
              style={{
                backgroundColor:
                  index % 2 === 0
                    ? "var(--color-bg-primary)"
                    : "var(--color-bg-secondary)",
                borderBottom: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  index % 2 === 0
                    ? "var(--color-bg-primary)"
                    : "var(--color-bg-secondary)";
              }}
            >
              <td
                data-testid="library-cell-title"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                {file.title}
              </td>
              <td
                data-testid="library-cell-path"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  color: "var(--color-text-secondary)",
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.path}
              </td>
              <td
                data-testid="library-cell-lastEdited"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(file.lastEdited)}
              </td>
              <td
                data-testid="library-cell-created"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(file.created)}
              </td>
            </tr>
          ))}
          {filteredAndSorted.length === 0 && (
            <tr>
              <td
                colSpan={4}
                data-testid="library-empty"
                style={{
                  padding: "var(--space-3)",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                {files.length === 0
                  ? "No files found. Mount a directory to get started."
                  : "No files match the current filter."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
