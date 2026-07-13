# --- STAGE 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Run as non-root user for security
USER node

# Execute the compiled application
CMD ["node", "dist/index.js"]
