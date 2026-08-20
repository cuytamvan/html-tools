# HTML Tools

Kumpulan tool HTML statis. Style bersama ada di `html/css/global.css`. JavaScript tetap di masing-masing file HTML.

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

## Run dengan Docker (nginx)

Bangun image dari Dockerfile:

```bash
docker build -t html-tools .
docker run --rm -p 8080:80 html-tools
```

Atau mount folder `html` ke nginx:

```bash
docker run -d --name html-tools \
  -p 8080:80 \
  -v "$(pwd)/html:/usr/share/nginx/html:ro" \
  --restart unless-stopped nginx:alpine
```

Folder `html` di-mount ke document root nginx. Port **8080** di host diarahkan ke port 80 di container.

Buka:

- http://localhost:8080/
- http://localhost:8080/json-searcher.html
- http://localhost:8080/json-diff.html
- http://localhost:8080/overtime.html
- http://localhost:8080/hashids-decoder.html
- http://localhost:8080/regex-tester.html
- http://localhost:8080/boilerplate.html

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
