# HTML Tools

Kumpulan tool HTML statis. Style bersama ada di `html/css/global.css`. JavaScript tetap di masing-masing file HTML.

## Setup Boilerplate

Halaman Boilerplate membaca `html/data/boilerplates.json`. File ini tidak ikut di-commit; salin dari contoh:

```bash
cp html/data/boilerplates.example.json html/data/boilerplates.json
```

Edit `html/data/boilerplates.json` untuk menambah atau mengubah perintah dan file. Struktur datanya:

```json
{
  "commands": [],
  "files": []
}
```

## Run dengan Docker (nginx)

Dari root repository ini:

```bash
docker run -d --name html-tools \
  -p 8080:80 \
  -v "$(pwd)/html:/usr/share/nginx/html:ro" \
  --restart unless-stopped nginx:alpine
```

atau sekali jalan:

```bash
docker run --rm --name html-tools \
  -p 8080:80 \
  -v "$(pwd)/html:/usr/share/nginx/html:ro" \
  nginx:alpine
```

Folder `html` di-mount ke document root nginx. Port **8080** di host diarahkan ke port 80 di container.

Buka:

- http://localhost:8080/
- http://localhost:8080/json-searcher.html
- http://localhost:8080/overtime.html
- http://localhost:8080/hashids-decoder.html
- http://localhost:8080/boilerplate.html

Hentikan server dengan `Ctrl+C`, atau:

```bash
docker stop html-tools
```
