FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm install --workspace=apps/web --workspace=packages/shared

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["npx", "vite", "--host"]
