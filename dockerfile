FROM node:16.20-alpine
LABEL maintainer="yue"

WORKDIR /usr/src/app
RUN apk add --no-cache tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN npm install --legacy-peer-deps && \
    if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; fi

COPY . .

RUN if [ "$NODE_ENV" != "production" ]; then npm run build; fi

RUN npm cache clean --force && \
    rm -rf /tmp/*

RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -D appuser && \
    chown -R appuser:appuser /usr/src/app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

CMD [ "node", "server.js" ]
