# Development and testing environment for Obsidian plugin
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install git for potential git operations
RUN apk add --no-cache git

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S obsidian -u 1001 -G nodejs

# Change ownership to nodejs user
RUN chown -R obsidian:nodejs /app
USER obsidian

# Expose port for development server if needed
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]