FROM nginx:alpine

COPY html /usr/share/nginx/html
COPY html/data/boilerplates.example.json /usr/share/nginx/html/data/boilerplates.json

EXPOSE 80
