/** Picks the delimiter that splits the header line into the most columns. */
export function detectDelimiter(text: string): string {
  const nl = text.search(/\r?\n/);
  const header = nl === -1 ? text : text.slice(0, nl);
  let best = ',', bestCount = 0;
  for (const d of [',', '\t', '|', ';']) {
    const n = header.split(d).length;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

/** RFC 4180-style parser: quoted fields, escaped quotes, embedded newlines, CRLF. */
export function parseDelimited(text: string, delimiter = detectDelimiter(text)): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === '') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^﻿/, '').toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}
