# Stage 1: Build the Vite frontend
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the app using the Express backend
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
# Install only production dependencies
# tsx is now in dependencies, so it will be installed
RUN npm install --production

# Copy the built frontend
COPY --from=builder /app/dist ./dist

# Copy the backend code and configs
COPY server.ts ./
COPY firebase-applet-config.json ./
COPY firestore.rules ./
COPY tsconfig.json ./

# Expose the port (Cloud Run sets the PORT env variable)
EXPOSE 8080

# The server listens on process.env.PORT, which Cloud Run provides
CMD ["npm", "run", "start"]
