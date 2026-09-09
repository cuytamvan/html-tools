const HEADING_RE = /^#{1,6}\s/;
const LIST_RE = /^(\s*([-*+]|\d+\.)\s)/;
const BLOCKQUOTE_RE = /^>\s?/;
const FENCE_RE = /^(```|~~~)/;

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return trimmed.startsWith('|') || trimmed.endsWith('|') || trimmed.split('|').length > 2;
}

function parseTableCells(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparatorCells(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function formatTableBlock(lines: string[]): string[] {
  const rows = lines.map(parseTableCells);
  const colCount = Math.max(0, ...rows.map((row) => row.length));
  if (colCount === 0) return lines;

  const normalized = rows.map((row) => {
    const next = [...row];
    while (next.length < colCount) next.push('');
    return next;
  });

  const separatorIndex = normalized.findIndex((cells, index) => index > 0 && isTableSeparatorCells(cells));
  const dataRows = normalized.filter((_, index) => index !== separatorIndex);
  const widths = Array.from({ length: colCount }, (_, col) =>
    Math.max(3, ...dataRows.map((row) => (row[col] ?? '').length)),
  );

  return normalized.map((cells, index) => {
    const isSeparator = index === separatorIndex;
    const parts = cells.map((cell, col) => {
      if (isSeparator) return ` ${'-'.repeat(widths[col])} `;
      return ` ${(cell ?? '').padEnd(widths[col])} `;
    });
    return `|${parts.join('|')}|`;
  });
}

function formatTables(lines: string[]): string[] {
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!isTableLine(lines[index]!)) {
      output.push(lines[index]!);
      index += 1;
      continue;
    }

    const block: string[] = [];
    while (index < lines.length && isTableLine(lines[index]!)) {
      block.push(lines[index]!);
      index += 1;
    }
    output.push(...formatTableBlock(block));
  }

  return output;
}

export function prettyPrintMarkdown(input: string): string {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const trimmed: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const fence = line.trimStart();
    if (FENCE_RE.test(fence)) {
      inFence = !inFence;
      trimmed.push(line);
      continue;
    }
    trimmed.push(inFence ? raw.replace(/\s+$/, '') : line);
  }

  const tabled = formatTables(trimmed);

  const spaced: string[] = [];
  for (const line of tabled) {
    const prev = spaced.at(-1);
    const lineIsTable = isTableLine(line);
    const prevIsTable = prev !== undefined && isTableLine(prev);
    const isStructural =
      Boolean(line) &&
      !lineIsTable &&
      (HEADING_RE.test(line) ||
        LIST_RE.test(line) ||
        BLOCKQUOTE_RE.test(line) ||
        FENCE_RE.test(line.trimStart()));

    if (lineIsTable && prev !== undefined && prev !== '' && !prevIsTable) {
      spaced.push('');
    }

    if (
      isStructural &&
      prev !== undefined &&
      prev !== '' &&
      !HEADING_RE.test(prev) &&
      !LIST_RE.test(prev) &&
      !BLOCKQUOTE_RE.test(prev) &&
      !FENCE_RE.test(prev.trimStart()) &&
      !prevIsTable
    ) {
      spaced.push('');
    }
    spaced.push(line);
  }

  const body = spaced
    .join('\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  return body ? `${body}\n` : '';
}
