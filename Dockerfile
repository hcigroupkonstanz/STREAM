FROM node:18

WORKDIR /stream/stream-server
COPY stream-server/package.json ./
RUN npm install
COPY stream-server .
RUN /bin/sh ./generate-cert.sh
RUN npm run build
RUN mkdir dist/data

WORKDIR /stream/stream-tablet
COPY stream-tablet/package.json ./
RUN npm install
COPY stream-tablet .
RUN npm run build

WORKDIR /stream/stream-server
# Webserver interface
EXPOSE 8080
# Admin Server port
EXPOSE 8090
# Unity AR port
EXPOSE 8835
# Unity Tracking Port
EXPOSE 8836

CMD [ "npm", "start" ]
