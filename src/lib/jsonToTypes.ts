import { escapeHtml } from '@/lib/escape';

export type TypeLang = 'go' | 'ts' | 'py';

export type GenerateTypesResult = {
  code: string;
  filename: string;
  status: string;
};

export const SAMPLE = {
  nama: 'Budi Santoso',
  umur: 28,
  aktif: true,
  saldo: 1250000.5,
  catatan: null,
  alamat: {
    jalan: 'Jl. Merdeka No. 1',
    kota: 'Jakarta',
    kode_pos: '10110',
  },
  tag: ['ops', 'backend'],
  proyek: [
    { id: 1, judul: 'API Gateway', selesai: true },
    { id: 2, judul: 'Billing', selesai: false, anggaran: 45000000 },
  ],
};

const ACRONYMS: Record<string, string> = {
  id: 'ID',
  ids: 'IDs',
  url: 'URL',
  html: 'HTML',
  json: 'JSON',
  uuid: 'UUID',
  api: 'API',
  http: 'HTTP',
  https: 'HTTPS',
  uri: 'URI',
  sql: 'SQL',
};

const PY_RES: Record<string, number> = {
  False: 1,
  None: 1,
  True: 1,
  and: 1,
  as: 1,
  assert: 1,
  async: 1,
  await: 1,
  break: 1,
  class: 1,
  continue: 1,
  def: 1,
  del: 1,
  elif: 1,
  else: 1,
  except: 1,
  finally: 1,
  for: 1,
  from: 1,
  global: 1,
  if: 1,
  import: 1,
  in: 1,
  is: 1,
  lambda: 1,
  nonlocal: 1,
  not: 1,
  or: 1,
  pass: 1,
  raise: 1,
  return: 1,
  try: 1,
  while: 1,
  with: 1,
  yield: 1,
  match: 1,
  type: 1,
  case: 1,
};

function isPlainObject(v: any) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toPascal(str: any) {
  const parts = String(str || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '';
  let out = parts
    .map((p) => {
      const lower = p.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join('');
  if (!/^[A-Za-z]/.test(out)) out = 'N' + out;
  return out;
}

function toSnake(str: any) {
  let p = String(str || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  if (!p) p = 'field';
  if (!/^[a-z_]/.test(p)) p = 'f_' + p;
  return p;
}

function singular(name: string) {
  if (/ies$/i.test(name) && name.length > 4) return name.slice(0, -3) + 'y';
  if (/ses$/i.test(name) && name.length > 4) return name.slice(0, -2);
  if (/s$/i.test(name) && !/ss$/i.test(name) && name.length > 3) return name.slice(0, -1);
  return name;
}

function uniqueName(base: string, used: Record<string, boolean>) {
  let name = base || 'Item';
  if (!used[name]) {
    used[name] = true;
    return name;
  }
  let i = 2;
  while (used[name + i]) i++;
  used[name + i] = true;
  return name + i;
}

function infer(value: any): any {
  if (value === null) return { k: 'null' };
  if (typeof value === 'boolean') return { k: 'bool' };
  if (typeof value === 'number') {
    if (Number.isFinite(value) && Number.isInteger(value)) return { k: 'int' };
    return { k: 'float' };
  }
  if (typeof value === 'string') return { k: 'string' };
  if (Array.isArray(value)) {
    if (!value.length) return { k: 'array', item: { k: 'empty' } };
    let item = infer(value[0]);
    for (let i = 1; i < value.length; i++) item = merge(item, infer(value[i]));
    return { k: 'array', item: item };
  }
  if (isPlainObject(value)) {
    const fields: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      fields[key] = infer(value[key]);
    });
    return { k: 'object', fields: fields, optional: {} };
  }
  return { k: 'any' };
}

function flatten(schema: any): any[] {
  if (schema.k === 'union') {
    return schema.variants.reduce((acc: any[], v: any) => acc.concat(flatten(v)), []);
  }
  return [schema];
}

function compatibleIndex(list: any[], schema: any) {
  for (let i = 0; i < list.length; i++) {
    const k = list[i].k;
    if (k === schema.k) return i;
    if ((k === 'int' && schema.k === 'float') || (k === 'float' && schema.k === 'int')) return i;
  }
  return -1;
}

function makeUnion(a: any, b: any) {
  const variants = flatten(a).concat(flatten(b));
  const acc: any[] = [];
  variants.forEach((v) => {
    const i = compatibleIndex(acc, v);
    if (i === -1) acc.push(v);
    else acc[i] = merge(acc[i], v);
  });
  if (acc.length === 1) return acc[0];
  return { k: 'union', variants: acc };
}

function merge(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;
  if (a.k === 'empty') return b;
  if (b.k === 'empty') return a;
  if (a.k === 'union' || b.k === 'union') return makeUnion(a, b);
  if ((a.k === 'int' && b.k === 'float') || (a.k === 'float' && b.k === 'int')) return { k: 'float' };
  if (a.k === 'array' && b.k === 'array') return { k: 'array', item: merge(a.item, b.item) };
  if (a.k === 'object' && b.k === 'object') {
    const keys: Record<string, boolean> = {};
    Object.keys(a.fields).forEach((k) => {
      keys[k] = true;
    });
    Object.keys(b.fields).forEach((k) => {
      keys[k] = true;
    });
    const fields: Record<string, any> = {};
    const optional: Record<string, boolean> = {};
    Object.keys(a.optional).forEach((k) => {
      if (a.optional[k]) optional[k] = true;
    });
    Object.keys(b.optional).forEach((k) => {
      if (b.optional[k]) optional[k] = true;
    });
    Object.keys(keys).forEach((key) => {
      const ha = Object.prototype.hasOwnProperty.call(a.fields, key);
      const hb = Object.prototype.hasOwnProperty.call(b.fields, key);
      if (ha && hb) fields[key] = merge(a.fields[key], b.fields[key]);
      else if (ha) {
        fields[key] = a.fields[key];
        optional[key] = true;
      } else {
        fields[key] = b.fields[key];
        optional[key] = true;
      }
    });
    return { k: 'object', fields: fields, optional: optional };
  }
  if (a.k === b.k) return a;
  return makeUnion(a, b);
}

function splitNull(schema: any) {
  if (schema.k !== 'union') return { inner: schema, nullable: false };
  const rest: any[] = [];
  let nullable = false;
  schema.variants.forEach((v: any) => {
    if (v.k === 'null') nullable = true;
    else rest.push(v);
  });
  if (!rest.length) return { inner: { k: 'null' }, nullable: false };
  if (rest.length === 1) return { inner: rest[0], nullable: nullable };
  return { inner: { k: 'union', variants: rest }, nullable: nullable };
}

function assignNames(schema: any, rootHint: string) {
  const root = toPascal(rootHint) || 'Root';
  const used: Record<string, boolean> = {};
  used[root] = true;
  const types: { name: string; schema: any }[] = [];
  const rootIsArray = schema.k === 'array';

  function walk(s: any, hint: string, isRoot: boolean) {
    if (!s) return;
    if (s.k === 'array') {
      walk(s.item, isRoot ? hint : singular(hint), isRoot);
      return;
    }
    if (s.k === 'union') {
      s.variants.forEach((v: any) => {
        walk(v, hint, false);
      });
      return;
    }
    if (s.k === 'object') {
      const name = isRoot ? root : uniqueName(toPascal(hint) || 'Item', used);
      s.typeName = name;
      Object.keys(s.fields).forEach((key) => {
        walk(s.fields[key], key, false);
      });
      types.push({ name: name, schema: s });
    }
  }

  if (rootIsArray) walk(schema.item, rootHint, true);
  else walk(schema, rootHint, true);

  return { types: types, rootName: root, rootSchema: schema, rootIsArray: rootIsArray };
}

function pad(s: string, n: number) {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

function goBare(schema: any) {
  const split = splitNull(schema);
  const s = split.inner;
  let t = 'interface{}';
  if (s.k === 'bool') t = 'bool';
  else if (s.k === 'int') t = 'int';
  else if (s.k === 'float') t = 'float64';
  else if (s.k === 'string') t = 'string';
  else if (s.k === 'array') t = '[]' + goRef(s.item, false);
  else if (s.k === 'object') t = s.typeName || 'struct{}';
  return t;
}

function goRef(schema: any, optional: boolean) {
  const split = splitNull(schema);
  const s = split.inner;
  let t = goBare(s);
  if ((optional || split.nullable) && s.k !== 'array' && t.charAt(0) !== '*') t = '*' + t;
  return t;
}

function emitGoStruct(obj: any) {
  const keys = Object.keys(obj.fields);
  const rows = keys.map((key) => {
    const optional = !!obj.optional[key];
    const typ = goRef(obj.fields[key], optional);
    const tagKey = optional ? key + ',omitempty' : key;
    return { name: toPascal(key) || 'Field', typ: typ, tag: '`json:"' + tagKey + '"`' };
  });
  if (!rows.length) return 'type ' + obj.typeName + ' struct {}';
  let n1 = 0;
  let n2 = 0;
  rows.forEach((r) => {
    if (r.name.length > n1) n1 = r.name.length;
    if (r.typ.length > n2) n2 = r.typ.length;
  });
  const body = rows.map((r) => '\t' + pad(r.name, n1) + ' ' + pad(r.typ, n2) + ' ' + r.tag).join('\n');
  return 'type ' + obj.typeName + ' struct {\n' + body + '\n}';
}

function emitGo(info: any) {
  const parts: string[] = [];
  if (info.rootIsArray && info.types.length) {
    parts.push('// JSON akar berupa array: []' + info.rootName);
  }
  info.types.forEach((t: any) => {
    parts.push(emitGoStruct(t.schema));
  });
  if (!info.types.length) {
    parts.push('type ' + info.rootName + ' ' + goRef(info.rootSchema, false));
  }
  return parts.join('\n\n') + '\n';
}

function tsBare(schema: any): string {
  const split = splitNull(schema);
  const s = split.inner;
  let t = 'unknown';
  if (s.k === 'bool') t = 'boolean';
  else if (s.k === 'int' || s.k === 'float') t = 'number';
  else if (s.k === 'string') t = 'string';
  else if (s.k === 'null') t = 'null';
  else if (s.k === 'array') t = tsBare(s.item) + '[]';
  else if (s.k === 'object') t = s.typeName || 'Record<string, unknown>';
  else if (s.k === 'union') {
    t = s.variants.map((v: any) => tsBare(v)).join(' | ');
  } else if (s.k === 'empty') t = 'unknown';
  if (split.nullable) t += ' | null';
  return t;
}

function tsKey(key: string) {
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return key;
  return JSON.stringify(key);
}

function emitTsInterface(obj: any) {
  const keys = Object.keys(obj.fields);
  if (!keys.length) return 'export interface ' + obj.typeName + ' {}';
  const body = keys
    .map((key) => {
      const optional = !!obj.optional[key];
      const typ = tsBare(obj.fields[key]);
      return '  ' + tsKey(key) + (optional ? '?' : '') + ': ' + typ + ';';
    })
    .join('\n');
  return 'export interface ' + obj.typeName + ' {\n' + body + '\n}';
}

function emitTs(info: any) {
  const parts: string[] = [];
  if (info.rootIsArray && info.types.length) {
    parts.push('// JSON akar berupa array: ' + info.rootName + '[]');
  }
  info.types.forEach((t: any) => {
    parts.push(emitTsInterface(t.schema));
  });
  if (!info.types.length) {
    parts.push('export type ' + info.rootName + ' = ' + tsBare(info.rootSchema) + ';');
  }
  return parts.join('\n\n') + '\n';
}

function pyBare(schema: any, state: { usesAny: boolean }): string {
  const split = splitNull(schema);
  const s = split.inner;
  let t = 'Any';
  if (s.k === 'bool') t = 'bool';
  else if (s.k === 'int') t = 'int';
  else if (s.k === 'float') t = 'float';
  else if (s.k === 'string') t = 'str';
  else if (s.k === 'null') {
    state.usesAny = true;
    t = 'Any | None';
  } else if (s.k === 'array') t = 'list[' + pyBare(s.item, state) + ']';
  else if (s.k === 'object') t = s.typeName || 'dict';
  else if (s.k === 'union') {
    t = s.variants.map((v: any) => pyBare(v, state)).join(' | ');
  } else {
    state.usesAny = true;
    t = 'Any';
  }
  if (t === 'Any') state.usesAny = true;
  if (split.nullable) t += ' | None';
  return t;
}

function uniqueSnake(key: string, used: Record<string, boolean>) {
  let base = toSnake(key);
  if (PY_RES[base]) base += '_';
  let name = base;
  let i = 2;
  while (used[name]) {
    name = base + '_' + i;
    i++;
  }
  used[name] = true;
  return name;
}

function emitPyClass(obj: any, state: { usesAny: boolean }) {
  const keys = Object.keys(obj.fields);
  const required: any[] = [];
  const optional: any[] = [];
  keys.forEach((key) => {
    const row = { key: key, schema: obj.fields[key], optional: !!obj.optional[key] };
    if (row.optional) optional.push(row);
    else required.push(row);
  });
  const used: Record<string, boolean> = {};
  const lines = required.concat(optional).map((row) => {
    const name = uniqueSnake(row.key, used);
    let typ = pyBare(row.schema, state);
    if (row.optional && typ.indexOf('| None') === -1) typ += ' | None';
    let line = '    ' + name + ': ' + typ;
    if (row.optional) line += ' = None';
    return line;
  });
  if (!lines.length) lines.push('    pass');
  return '@dataclass\nclass ' + obj.typeName + ':\n' + lines.join('\n');
}

function emitPy(info: any) {
  const state = { usesAny: false };
  let body: string;
  if (info.types.length) {
    body = info.types.map((t: any) => emitPyClass(t.schema, state)).join('\n\n');
  } else {
    body = info.rootName + ' = ' + pyBare(info.rootSchema, state);
  }
  const parts: string[] = [];
  if (info.types.length) parts.push('from dataclasses import dataclass');
  if (state.usesAny) parts.push('from typing import Any');
  if (parts.length) parts.push('');
  if (info.rootIsArray && info.types.length) {
    parts.push('# JSON akar berupa list[' + info.rootName + ']');
    parts.push('');
  }
  parts.push(body);
  return parts.join('\n') + '\n';
}

export function fileNameFor(root: string, currentLang: TypeLang) {
  const base = toSnake(toPascal(root) || 'root') || 'root';
  if (currentLang === 'ts') return base + '.ts';
  if (currentLang === 'py') return base + '.py';
  return base + '.go';
}

export function highlightCode(code: string, currentLang: TypeLang) {
  const keywords = {
    go: 'type|struct|interface|map|string|int64|int|float64|bool|nil|byte|rune|error',
    ts: 'export|interface|type|string|number|boolean|null|undefined|unknown|any|readonly',
    py: 'from|import|class|def|None|True|False|dataclass|and|or|not|pass',
  }[currentLang];
  const tokenRe =
    currentLang === 'py'
      ? /(#[^\n]*|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g
      : currentLang === 'go'
        ? /(\/\/[^\n]*|`[^`]*`|"[^"\\]*(?:\\.[^"\\]*)*")/g
        : /(\/\/[^\n]*|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;

  function paintText(text: string) {
    return escapeHtml(text).replace(new RegExp('\\b(' + keywords + ')\\b', 'g'), '<span class="tok-keyword">$1</span>');
  }

  let html = '';
  let last = 0;
  let m: RegExpExecArray | null;
  tokenRe.lastIndex = 0;
  while ((m = tokenRe.exec(code))) {
    html += paintText(code.slice(last, m.index));
    const tok = m[0];
    const cls = tok.charAt(0) === '/' || tok.charAt(0) === '#' ? 'tok-comment' : 'tok-string';
    html += '<span class="' + cls + '">' + escapeHtml(tok) + '</span>';
    last = m.index + tok.length;
  }
  html += paintText(code.slice(last));
  return html;
}

export function generateTypes(jsonValue: unknown, rootName: string, lang: TypeLang): GenerateTypesResult {
  const info = assignNames(infer(jsonValue), rootName);
  let code: string;
  if (lang === 'ts') code = emitTs(info);
  else if (lang === 'py') code = emitPy(info);
  else code = emitGo(info);
  const n = info.types.length;
  const langLabel = lang === 'ts' ? 'TypeScript' : lang === 'py' ? 'Python' : 'Go';
  return {
    code,
    filename: fileNameFor(rootName, lang),
    status: (n ? n + ' tipe' : '1 alias') + ' · ' + langLabel + (info.rootIsArray ? ' · akar array' : ''),
  };
}
