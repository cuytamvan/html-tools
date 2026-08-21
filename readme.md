# HTML Tools

Browser tools that run locally. The Vue app is at the repo root; tool pages live in `src/pages`.

## Boilerplate setup

On the Boilerplate page, download the sample JSON, then choose its folder:

1. Click **Download sample** (saved as `boilerplates.json`)
2. Edit the file if needed
3. Click **Choose folder** and pick the folder that contains `boilerplates.json`

In Chrome or Edge, while the Boilerplate tab stays open, changes to that file reload automatically. Other browsers need you to choose the folder again after an edit.

Data shape:

```json
{
  "commands": [],
  "files": []
}
```

## Run locally

```bash
bun install
bun run dev
```

Open http://localhost:5173/

- http://localhost:5173/#/
- http://localhost:5173/#/json-searcher
- http://localhost:5173/#/json-diff
- http://localhost:5173/#/json-types
- http://localhost:5173/#/csv-json
- http://localhost:5173/#/overtime
- http://localhost:5173/#/hashids
- http://localhost:5173/#/regex-tester
- http://localhost:5173/#/user-agent
- http://localhost:5173/#/boilerplate
- http://localhost:5173/#/qr-code

## Run with Docker (nginx)

Build the image from the Dockerfile (Vue build stage, then nginx serves `dist`):

```bash
docker build -t html-tools .
docker run --rm -p 8080:80 html-tools
```

Host port **8080** maps to port 80 in the container. Open http://localhost:8080/

Stop the server with `Ctrl+C`, or:

```bash
docker stop html-tools
```

## Pull from GHCR

```bash
docker pull ghcr.io/cuytamvan/html-tools:latest
docker run --rm -p 8080:80 ghcr.io/cuytamvan/html-tools:latest
```

For a specific version, use a semver tag, for example `ghcr.io/cuytamvan/html-tools:1.2.3`.

## Contributing

Setup, issues, and pull requests are in [CONTRIBUTING.md](CONTRIBUTING.md).

For now, the only contributor is [Muhammad Rizki Wahyudi](https://github.com/cuytamvan).

## Contributors

- [Muhammad Rizki Wahyudi](https://github.com/cuytamvan)
