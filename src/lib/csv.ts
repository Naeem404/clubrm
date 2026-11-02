/**
 * Minimal, safe CSV builder used by every "Export CSV" button.
 *
 * - RFC 4180 quoting: cells containing `"`, `,`, CR or LF are wrapped in
 *   double quotes and inner quotes are doubled.
 * - Formula-injection guard (CSV injection / "DDE"): cells beginning with
 *   `=`, `+`, `-`, `@`, TAB or CR are prefixed with a single quote so Excel /
 *   Sheets treat them as text instead of evaluating them.
 */
export type CsvCell = string | number | boolean | null | undefined | Date

const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ""
  let str: string
  if (value instanceof Date) {
    str = Number.isNaN(value.getTime()) ? "" : value.toISOString()
  } else if (typeof value === "number") {
    // Plain numbers (including negatives) are safe and should stay numeric.
    return Number.isFinite(value) ? String(value) : ""
  } else {
    str = String(value)
  }

  if (FORMULA_PREFIX.test(str)) {
    str = `'${str}`
  }

  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Build a CSV string from a header row and data rows. Uses CRLF line endings. */
export function toCsv(headers: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [headers.map(escapeCsvCell).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","))
  }
  return lines.join("\r\n")
}

/** Build a CSV from objects using an ordered column definition. */
export function objectsToCsv<T>(
  items: readonly T[],
  columns: readonly { header: string; value: (item: T) => CsvCell }[],
): string {
  return toCsv(
    columns.map((c) => c.header),
    items.map((item) => columns.map((c) => c.value(item))),
  )
}

/** Trigger a browser download of `csv` as `filename`. No-op outside the browser. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) return
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.replace(/[\\/:*?"<>|]+/g, "_")
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
