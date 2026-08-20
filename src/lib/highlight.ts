import { escapeHtml } from '@/lib/escape';

export type HighlightRule = { re: RegExp; type: string };

export function tokenize(code: string, rules: HighlightRule[]): string {
  let rest = code;
  let html = '';
  while (rest.length) {
    let hit: { type: string; text: string } | null = null;
    for (let i = 0; i < rules.length; i++) {
      const m = rest.match(rules[i].re);
      if (m) {
        hit = { type: rules[i].type, text: m[0] };
        break;
      }
    }
    if (!hit) {
      html += escapeHtml(rest.charAt(0));
      rest = rest.slice(1);
    } else {
      html += '<span class="tok-' + hit.type + '">' + escapeHtml(hit.text) + '</span>';
      rest = rest.slice(hit.text.length);
    }
  }
  return html;
}

const YAML_RULES: HighlightRule[] = [
  { re: /^[ \t]*#.*(?:\n|$)/, type: 'comment' },
  { re: /^'(?:\\'|[^'])*'/, type: 'string' },
  { re: /^"(?:\\.|[^"\\])*"/, type: 'string' },
  { re: /^(?:true|false|null|yes|no)\b/, type: 'keyword' },
  { re: /^-?\d+(?:\.\d+)?\b/, type: 'number' },
  { re: /^[\w./-]+(?=\s*:)/, type: 'key' },
];

const BASH_RULES: HighlightRule[] = [
  { re: /^[ \t]*#.*(?:\n|$)/, type: 'comment' },
  { re: /^'(?:\\'|[^'])*'/, type: 'string' },
  { re: /^"(?:\\.|[^"\\])*"/, type: 'string' },
  { re: /^\$\{?[A-Za-z_][\w]*\}?/, type: 'var' },
  {
    re: /^(?:if|then|else|elif|fi|for|do|done|in|while|case|esac|function|return|exit|until)\b/,
    type: 'keyword',
  },
  { re: /^--?[\w-]+/, type: 'flag' },
];

const DOCKERFILE_RULES: HighlightRule[] = [
  { re: /^[ \t]*#.*(?:\n|$)/, type: 'comment' },
  {
    re: /^(?:FROM|RUN|CMD|COPY|ADD|WORKDIR|ENV|EXPOSE|USER|VOLUME|ENTRYPOINT|LABEL|ARG|HEALTHCHECK|AS)\b/,
    type: 'keyword',
  },
  { re: /^'(?:\\'|[^'])*'/, type: 'string' },
  { re: /^"(?:\\.|[^"\\])*"/, type: 'string' },
  { re: /^--?[\w-]+/, type: 'flag' },
];

const NGINX_RULES: HighlightRule[] = [
  { re: /^[ \t]*#.*(?:\n|$)/, type: 'comment' },
  {
    re: /^(?:server|location|listen|root|index|try_files|proxy_pass|proxy_set_header|server_name)\b/,
    type: 'keyword',
  },
  { re: /^'(?:\\'|[^'])*'/, type: 'string' },
  { re: /^"(?:\\.|[^"\\])*"/, type: 'string' },
  { re: /^\$[\w_]+/, type: 'var' },
  { re: /^\d+\b/, type: 'number' },
];

export function highlight(code: string, language: unknown): string {
  const lang = String(language || '').toLowerCase();
  if (lang === 'yaml' || lang === 'yml') return tokenize(code, YAML_RULES);
  if (lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'gitignore')
    return tokenize(code, BASH_RULES);
  if (lang === 'dockerfile' || lang === 'docker') return tokenize(code, DOCKERFILE_RULES);
  if (lang === 'nginx') return tokenize(code, NGINX_RULES);
  return escapeHtml(code);
}
