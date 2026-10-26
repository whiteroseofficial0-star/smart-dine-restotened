/** CSV with RFC-4180 quoting and protection against spreadsheet formula injection (=, +, -, @ prefixes). */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export const toCSV = (rows: unknown[][]): string => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
