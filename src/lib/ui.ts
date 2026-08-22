const btnBase =
  'inline-block cursor-pointer rounded-sm border px-3.5 py-2 font-sans text-ui font-medium no-underline transition-[background-color,color,border-color,transform] duration-150 ease-editorial active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100';

const tagBase = 'mb-3 inline-block rounded-full px-2 py-0.75 text-2xs font-medium uppercase tracking-tag';

export const ui = {
  wrap: 'relative z-[1] mx-auto max-w-5xl px-5 py-16 tool:px-6 tool:py-24 tool:pb-32',
  wrapLanding: 'relative z-[1] mx-auto max-w-5xl px-5 py-0 tool:px-6',
  card: 'rounded-md border border-line bg-surface p-8',
  panel: 'border-t border-line py-12 first-of-type:border-t-0 first-of-type:pt-0',
  panelTitle: 'mb-4 text-2xs font-semibold uppercase tracking-kicker text-muted',
  pageTitle: 'mb-3 font-serif text-page font-normal tracking-display tool:text-display',
  sectionTitle: 'm-0 font-serif text-4xl font-normal leading-[1.1] tracking-display',
  cardTitle: 'font-serif text-card font-normal tracking-display',
  meta: 'text-ui text-muted',
  hint: 'mt-1.5 text-xs text-muted empty:hidden',
  note: 'mt-4 text-ui text-muted',
  lead: 'm-0 max-w-[36em] text-body text-muted',
  row: 'flex flex-wrap items-center gap-3',
  rowBetween: 'flex flex-wrap items-center justify-between gap-3',
  choices: 'flex flex-wrap gap-2',
  split: 'grid grid-cols-1 items-start gap-4 tool:grid-cols-2',
  form: 'grid grid-cols-1 gap-x-6 gap-y-5 tool:grid-cols-2',
  formAuto: 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-5',
  fieldFull: 'col-span-full',
  label: 'mb-1.5 block text-xs font-medium',
  input:
    'w-full rounded-sm border border-line bg-surface px-3 py-2.5 font-sans text-sm text-ink focus:border-ink focus:outline-none',
  inputMono: 'font-mono text-ui',
  textarea:
    'w-full min-h-[120px] resize-y rounded-sm border border-line bg-surface px-3.5 py-3 font-mono text-ui leading-[1.55] text-ink focus:border-ink focus:outline-none',
  jsonPane: 'min-h-[240px]',
  search:
    'min-w-[200px] flex-[1_1_260px] rounded-none border-0 border-b border-line bg-transparent px-0 py-2 text-base tracking-tight focus:border-ink focus:outline-none',
  select:
    'max-w-[220px] rounded-sm border border-line bg-surface px-2.5 py-1.5 text-ui text-ink focus:border-ink focus:outline-none',
  btnGhost: `${btnBase} border-line bg-surface text-ink hover:border-line-strong`,
  btnGhostSm: `${btnBase} border-line bg-surface px-2.75 py-1.5 text-xs text-ink hover:border-line-strong`,
  btnPrimary: `${btnBase} border-ink bg-ink text-white hover:border-ink-soft hover:bg-ink-soft hover:text-white`,
  btnPrimarySm: `${btnBase} border-ink bg-ink px-2.75 py-1.5 text-xs text-white hover:border-ink-soft hover:bg-ink-soft hover:text-white`,
  btnDanger: `${btnBase} border-transparent bg-danger-bg text-danger hover:border-transparent hover:bg-danger-soft`,
  btnDangerSm: `${btnBase} border-transparent bg-danger-bg px-2.75 py-1.5 text-xs text-danger hover:border-transparent hover:bg-danger-soft`,
  btnActive: `${btnBase} border-ink bg-ink px-2.75 py-1.5 text-xs text-white hover:border-ink hover:bg-ink hover:text-white`,
  tag: `${tagBase} bg-pale-yellow text-pale-yellow-ink`,
  tagBlue: `${tagBase} bg-pale-blue text-pale-blue-ink`,
  tagGreen: `${tagBase} bg-pale-green text-pale-green-ink`,
  tagRed: `${tagBase} bg-danger-bg text-danger`,
  tagInline: 'mb-0',
  badge:
    'whitespace-nowrap rounded-full bg-pale-blue px-2.5 py-1 text-2xs font-medium tracking-tag text-pale-blue-ink uppercase',
  error: 'mt-3.5 rounded-sm bg-danger-bg px-3 py-2.5 text-ui text-danger',
  toast: 'fixed bottom-7 left-1/2 z-[60] -translate-x-1/2 rounded-sm bg-ink px-4 py-2.5 text-ui text-white',
  overlay: 'fixed inset-0 z-50 items-center justify-center bg-overlay',
  modal: 'w-[380px] max-w-[90vw] rounded-md border border-line bg-surface p-8',
  modalWide: 'flex max-h-[84vh] w-[640px] max-w-[90vw] flex-col rounded-md border border-line bg-surface p-8',
  modalTitle: 'mb-2 font-serif text-2xl font-normal leading-[1.15] tracking-display',
  modalCopy: 'mb-5.5 text-sm leading-[1.6] text-muted',
  modalActions: 'flex flex-wrap justify-end gap-2',
  tableScroll: 'mt-2 max-h-[62vh] overflow-auto rounded-md border border-line bg-surface',
  table: 'w-full border-collapse text-ui',
  th: 'sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-surface px-3.5 py-3 text-left font-semibold text-ink first:w-10 first:font-medium first:text-muted',
  td: 'max-w-80 border-b border-line px-3.5 py-2.5 align-top',
  tdIdx: 'font-mono text-xs text-muted tabular-nums',
  tdValue: 'overflow-hidden text-ellipsis whitespace-nowrap',
  tdJson: 'font-mono text-muted',
  empty: 'px-6 py-16 text-center text-sm text-muted',
  resultList: 'border-t border-line first:border-t-0',
  resultRow: 'flex items-baseline justify-between gap-4 border-b border-line py-3.5 text-sm last:border-b-0',
  resultLabel: 'text-muted',
  resultValue: 'text-right font-mono text-ui font-medium tabular-nums',
  resultTotal: 'font-serif text-total font-normal tracking-tight text-ink',
  codeWrap: 'relative overflow-hidden rounded-md border border-line bg-surface',
  codeToolbar: 'flex items-center justify-between gap-2 border-b border-line bg-paper px-3.5 py-2.5 text-xs text-muted',
  filename: 'font-mono text-ink',
  codeBlock: 'm-0 max-h-[62vh] overflow-auto bg-surface p-4 font-mono text-ui leading-[1.6] whitespace-pre text-ink',
  codeSnippet:
    'mt-4.5 overflow-x-auto rounded-sm border border-line bg-bone px-4.5 py-4 font-mono text-xs leading-[1.7] whitespace-pre text-ink',
  regexPreview:
    'm-0 min-h-40 rounded-sm border border-line bg-bone px-3.5 py-3 font-mono text-ui leading-[1.55] break-words whitespace-pre-wrap text-ink',
  toolCard:
    'flex min-h-44 flex-col justify-end rounded-md border border-line bg-surface p-8 text-inherit no-underline transition-[box-shadow,transform] duration-200 ease-editorial hover:shadow-lift active:scale-[0.98]',
  howtoCard: 'min-h-0 rounded-md border border-line p-8 pb-10 hero:min-h-60',
  sectionHead: 'mb-10 flex flex-col items-start justify-between gap-6 hero:flex-row hero:items-end',
  srFile: 'pointer-events-none absolute h-px w-px opacity-0',
};

export function choiceClass(active: boolean): string {
  return active ? ui.btnActive : ui.btnGhostSm;
}

export function tagClass(kind: string, inline = false): string {
  const base = kind === 'blue' ? ui.tagBlue : kind === 'green' ? ui.tagGreen : kind === 'red' ? ui.tagRed : ui.tag;
  return inline ? `${base} ${ui.tagInline}` : base;
}
