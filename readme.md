# HTML Tools

Kumpulan tool HTML statis. Style bersama ada di `html/css/global.css`. JavaScript tetap di masing-masing file HTML.

## Run dengan Docker (nginx)

Dari root repository ini:

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
