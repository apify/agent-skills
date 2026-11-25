# Base image with Node.js. See https://docs.apify.com/sdk/js/docs/guides/docker-images
FROM apify/actor-node:24-slim

# Copy only the manifests first, so the dependency layer is cached between builds.
COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
    && if [ -f package-lock.json ]; then npm ci --omit=dev --omit=optional; else npm install --omit=dev --omit=optional; fi \
    && rm -r ~/.npm

# The Actor needs only its source and its definition.
COPY --chown=myuser:myuser src ./src
COPY --chown=myuser:myuser .actor ./.actor

CMD ["node", "src/main.js"]
