export type TraefikLabelInput = {
  domain: string;
  http: boolean;
  https: boolean;
  certResolver?: string;
  port?: string;
};

export type TraefikLabelResult =
  | { ok: true; labels: string; compose: string; routerName: string }
  | { ok: false; error: 'domain' | 'entrypoint' | 'port' };

export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
}

export function routerNameFromDomain(domain: string): string {
  const slug = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'app';
}

function labelLines(input: TraefikLabelInput, domain: string, name: string): string[] {
  const lines = ['  - "traefik.enable=true"'];

  if (input.http) {
    const router = input.http && input.https ? `${name}-http` : name;
    lines.push(`  - "traefik.http.routers.${router}.rule=Host(\`${domain}\`)"`);
    lines.push(`  - "traefik.http.routers.${router}.entrypoints=web"`);
    lines.push(`  - "traefik.http.routers.${router}.service=${name}"`);
    if (input.http && input.https) {
      lines.push(`  - "traefik.http.routers.${router}.middlewares=${name}-redirect"`);
      lines.push(`  - "traefik.http.middlewares.${name}-redirect.redirectscheme.scheme=https"`);
      lines.push(`  - "traefik.http.middlewares.${name}-redirect.redirectscheme.permanent=true"`);
    }
  }

  if (input.https) {
    const resolver = (input.certResolver ?? '').trim() || 'letsencrypt';
    lines.push(`  - "traefik.http.routers.${name}.rule=Host(\`${domain}\`)"`);
    lines.push(`  - "traefik.http.routers.${name}.entrypoints=websecure"`);
    lines.push(`  - "traefik.http.routers.${name}.tls=true"`);
    lines.push(`  - "traefik.http.routers.${name}.tls.certresolver=${resolver}"`);
    lines.push(`  - "traefik.http.routers.${name}.service=${name}"`);
  }

  const port = (input.port ?? '').trim();
  if (port) {
    lines.push(`  - "traefik.http.services.${name}.loadbalancer.server.port=${port}"`);
  }

  return lines;
}

export function generateTraefikLabels(input: TraefikLabelInput): TraefikLabelResult {
  const domain = normalizeDomain(input.domain);
  if (!domain) return { ok: false, error: 'domain' };
  if (!input.http && !input.https) return { ok: false, error: 'entrypoint' };

  const port = (input.port ?? '').trim();
  if (port && !/^\d+$/.test(port)) return { ok: false, error: 'port' };

  const name = routerNameFromDomain(domain);
  const labelBlock = labelLines(input, domain, name);
  const labels = ['labels:', ...labelBlock].join('\n');
  const compose = ['services:', '  app:', '    image: your-image:latest', labels].join('\n');

  return { ok: true, labels, compose, routerName: name };
}
