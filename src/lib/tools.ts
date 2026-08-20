export type ToolTag = 'blue' | 'green' | 'red' | '';

export type Tool = {
  path: string;
  title: string;
  blurb: string;
  tag: string;
  tagClass: ToolTag;
};

export const tools: Tool[] = [
  {
    path: '/json-searcher',
    title: 'JSON Searcher',
    blurb: 'Paste object atau array, lalu cari dan filter hasilnya dalam tabel.',
    tag: 'JSON',
    tagClass: 'blue',
  },
  {
    path: '/json-diff',
    title: 'JSON Diff',
    blurb: 'Bandingkan dua JSON, lihat path yang diubah, ditambah, atau dihapus.',
    tag: 'JSON',
    tagClass: 'blue',
  },
  {
    path: '/json-types',
    title: 'JSON ke Tipe',
    blurb: 'Ubah JSON menjadi struct Go, interface TypeScript, atau dataclass Python.',
    tag: 'JSON',
    tagClass: 'blue',
  },
  {
    path: '/csv-json',
    title: 'CSV / JSON',
    blurb: 'Ubah CSV menjadi JSON, atau JSON menjadi CSV, lalu salin atau unduh hasilnya.',
    tag: 'Data',
    tagClass: '',
  },
  {
    path: '/overtime',
    title: 'Perhitungan Lembur',
    blurb: 'Hitung upah lembur dari gaji, hari kerja, dan jam lembur.',
    tag: 'Gaji',
    tagClass: '',
  },
  {
    path: '/hashids',
    title: 'Hashids',
    blurb: 'Encode angka menjadi hash, atau decode hash menjadi angka.',
    tag: 'Hash',
    tagClass: 'green',
  },
  {
    path: '/regex-tester',
    title: 'Regex Tester',
    blurb: 'Uji pola terhadap teks, lihat kecocokan, grup, dan hasil ganti.',
    tag: 'Regex',
    tagClass: 'blue',
  },
  {
    path: '/user-agent',
    title: 'User Agent Parser',
    blurb: 'Urai User-Agent menjadi peramban, OS, mesin, dan tipe perangkat.',
    tag: 'Web',
    tagClass: 'green',
  },
  {
    path: '/boilerplate',
    title: 'Boilerplate',
    blurb: 'Generate perintah dan file siap pakai, seperti Docker Compose Postgres dan Redis.',
    tag: 'File',
    tagClass: 'red',
  },
];
