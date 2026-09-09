FROM node:18-alpine

RUN addgroup -S -g 10001 app \
    && adduser -S -D -u 10001 -G app -h /home/app app \
    && mkdir -p /app /home/app \
    && chown 10001:10001 /app /home/app
ENV HOME=/home/app

WORKDIR /app

COPY --chown=10001:10001 package*.json ./

RUN npm ci --only=production && npm cache clean --force

RUN mkdir -p uploads

COPY --chown=10001:10001 . .

EXPOSE 3000

# Define environment variable defaults
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

CMD ["npm", "--prefix", "/app", "start"]

RUN chown -R 10001:10001 /app /home/app \
    && chmod -R u+rwX /app /home/app
USER 10001:10001
