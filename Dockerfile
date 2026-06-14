FROM node:20-alpine

WORKDIR /app

# Copy monorepo structure
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Install pnpm
RUN npm install -g pnpm@10.33.2

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @met/api...

# Expose tRPC port
EXPOSE 4000

# Start API
CMD ["pnpm", "--filter", "@met/api", "start"]
