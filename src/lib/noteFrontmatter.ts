export type NoteFrontmatter = {
  title: string;
  category: string;
};

export type ParsedNoteFile = NoteFrontmatter & {
  content: string;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseYamlLine(line: string): [string, string] | null {
  const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
  if (!match) return null;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [match[1], value];
}

function parseFrontmatterBlock(raw: string): NoteFrontmatter {
  const fields: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const parsed = parseYamlLine(line.trim());
    if (parsed) fields[parsed[0]] = parsed[1];
  }
  return {
    title: fields.title ?? '',
    category: fields.category ?? '',
  };
}

function formatYamlLine(key: string, value: string): string {
  if (!value) return `${key}:`;
  if (/[:#\n]|^\s|\s$/.test(value) || /[{[\],&*?|>!]/.test(value)) {
    return `${key}: ${JSON.stringify(value)}`;
  }
  return `${key}: ${value}`;
}

export function parseNoteFile(text: string): ParsedNoteFile {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    return { title: '', category: '', content: text.replace(/^\n+/, '') };
  }
  const meta = parseFrontmatterBlock(match[1]);
  return { ...meta, content: match[2].replace(/^\n+/, '') };
}

export function serializeNoteFile(input: NoteFrontmatter & { content: string }): string {
  const lines = [
    '---',
    formatYamlLine('title', input.title),
    formatYamlLine('category', input.category),
    '---',
    '',
    input.content.replace(/^\n+/, ''),
  ];
  const body = lines.join('\n');
  return body.endsWith('\n') ? body : `${body}\n`;
}
