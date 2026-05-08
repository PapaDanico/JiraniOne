// CSV cell escaper.
//
// User-controlled fields exported to CSV are a known formula-injection
// vector: a name like `=cmd|'/c calc'!A1` becomes a live formula when the
// CSV opens in Excel/Sheets. Mitigation per OWASP guidance:
//
//   1. Prefix any cell starting with =, +, -, @, tab, or CR with a single
//      quote so the spreadsheet treats it as a literal string.
//   2. Wrap every value in double quotes and double up internal quotes —
//      handles commas / newlines / quotes inside the cell.
//
// Used by visitors CSV export and any future estate-data CSV.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function safeCsvCell(raw: unknown): string {
  if (raw == null) return '""';
  const v = raw instanceof Date ? raw.toISOString() : String(raw);
  const escaped = (FORMULA_PREFIX.test(v) ? `'${v}` : v).replace(/"/g, '""');
  return `"${escaped}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(safeCsvCell).join(",");
}
