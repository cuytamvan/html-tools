export type ToolTag = 'blue' | 'green' | 'red' | '';

export type ToolId =
  | 'jsonSearcher'
  | 'jsonDiff'
  | 'jsonTypes'
  | 'csvJson'
  | 'overtime'
  | 'hashids'
  | 'regexTester'
  | 'userAgent'
  | 'boilerplate'
  | 'qrCode';

export type Tool = {
  id: ToolId;
  path: string;
  tag: string;
  tagClass: ToolTag;
};

export const tools: Tool[] = [
  { id: 'jsonSearcher', path: '/json-searcher', tag: 'JSON', tagClass: 'blue' },
  { id: 'jsonDiff', path: '/json-diff', tag: 'JSON', tagClass: 'blue' },
  { id: 'jsonTypes', path: '/json-types', tag: 'JSON', tagClass: 'blue' },
  { id: 'csvJson', path: '/csv-json', tag: 'Data', tagClass: '' },
  { id: 'overtime', path: '/overtime', tag: 'Pay', tagClass: '' },
  { id: 'hashids', path: '/hashids', tag: 'Hash', tagClass: 'green' },
  { id: 'regexTester', path: '/regex-tester', tag: 'Regex', tagClass: 'blue' },
  { id: 'userAgent', path: '/user-agent', tag: 'Web', tagClass: 'green' },
  { id: 'boilerplate', path: '/boilerplate', tag: 'File', tagClass: 'red' },
  { id: 'qrCode', path: '/qr-code', tag: 'QR', tagClass: 'green' },
];
