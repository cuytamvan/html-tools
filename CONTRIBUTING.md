# Contributing

Open issues and pull requests at [github.com/cuytamvan/html-tools](https://github.com/cuytamvan/html-tools).

For now, the only contributor is [Muhammad Rizki Wahyudi](https://github.com/cuytamvan).

## Issues

Use the templates in `.github/ISSUE_TEMPLATE/` (bug, feature, enhancement, documentation, other). Name the page involved, for example JSON Searcher or CSV / JSON.

## Local setup

Use [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Open http://localhost:5173/. Routes use hash history, for example `/#/json-searcher`.

Production build:

```bash
bunx vue-tsc -p tsconfig.app.json --noEmit
bunx vite build
```

Docker image (nginx serves `dist` on port 80):

```bash
docker build -t html-tools .
docker run --rm -p 8080:80 html-tools
```

## Changes

- The Vue app lives in `src/`. Tool pages are in `src/pages/`.
- UI copy goes through vue-i18n. Default locale is English. Add new strings in `src/i18n/locales/en.ts` and `src/i18n/locales/id.ts`.
- Package manager: Bun. Do not commit `.env` files or credentials.

Suggested flow:

1. Open an issue, or pick an existing one.
2. Branch from the default branch.
3. Keep commits focused (one topic per PR).
4. Open a pull request. Describe what changed and how to test it.

## Contributors

- [Muhammad Rizki Wahyudi](https://github.com/cuytamvan)
