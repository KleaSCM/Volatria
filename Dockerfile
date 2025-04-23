# Build stage for Go backend
FROM golang:1.23-alpine AS go-builder
WORKDIR /app/backend
COPY volatriabak/go.mod volatriabak/go.sum ./
RUN go mod download
COPY volatriabak/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Build stage for Next.js frontend
FROM node:18-alpine AS node-builder
WORKDIR /app/frontend
COPY volatriafront/package*.json ./
RUN npm install --legacy-peer-deps
COPY volatriafront/ .
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# Final stage
FROM node:18-alpine
WORKDIR /app

# Install Go runtime for the backend
RUN apk add --no-cache ca-certificates

# Copy backend files
COPY --from=go-builder /app/backend/main ./backend/
COPY --from=go-builder /app/backend/volatria.db ./backend/

# Copy frontend files
COPY --from=node-builder /app/frontend/public ./frontend/public
COPY --from=node-builder /app/frontend/.next/standalone ./frontend/
COPY --from=node-builder /app/frontend/.next/static ./frontend/.next/static

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV API_KEY=your_alpha_vantage_api_key

# Expose ports
EXPOSE 3000 8080

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app/backend && ./main & \n\
cd /app/frontend && node server.js' > /app/start.sh && \
chmod +x /app/start.sh

CMD ["/app/start.sh"] 