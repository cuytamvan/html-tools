# HTML Tools

Kumpulan tool yang berjalan di browser. Aplikasi Vue di root repo, halaman tool ada di `src/pages`.

## Setup Boilerplate

Di halaman Boilerplate, unduh contoh JSON lalu pilih foldernya:

1. Klik **Unduh contoh** (tersimpan sebagai `boilerplates.json`)
2. Edit file jika perlu
3. Klik **Pilih folder** dan pilih folder yang berisi `boilerplates.json`

Di Chrome atau Edge, selama tab Boilerplate tetap terbuka, perubahan pada file itu ikut ter-load otomatis. Browser lain perlu pilih lagi setelah diedit.

Struktur datanya:

```json
{
  "commands": [],
  "files": []
}
```

## Jalankan di lokal

```bash
bun install
bun run dev
```

Buka http://localhost:5173/

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

## Run dengan Docker (nginx)

Bangun image dari Dockerfile (stage build Vue, lalu nginx menyajikan `dist`):

```bash
docker build -t html-tools .
docker run --rm -p 8080:80 html-tools
```

Port **8080** di host diarahkan ke port 80 di container. Buka http://localhost:8080/

Hentikan server dengan `Ctrl+C`, atau:

```bash
docker stop html-tools
```

## Pull dari GHCR

```bash
docker pull ghcr.io/cuytamvan/html-tools:latest
docker run --rm -p 8080:80 ghcr.io/cuytamvan/html-tools:latest
```

Versi tertentu pakai tag semver, contoh `ghcr.io/cuytamvan/html-tools:1.2.3`.
