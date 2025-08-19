# Build stage
FROM node:20.0.0-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .

# Run stage
FROM node:20.0.0-alpine
WORKDIR /app
COPY --from=build /app .
RUN adduser -D appuser && chown -R appuser /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:3000 || exit 1
CMD ["node", "server.js"]