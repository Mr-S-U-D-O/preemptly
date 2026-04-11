FROM node:20-slim
ENV NODE_ENV=production

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy all source files
COPY . .

# Build the frontend (Vite)
RUN npm run build

# The app listens on PORT (default 8080)
EXPOSE 8080

# Use tsx to run the server.ts directly in production
CMD ["npm", "run", "start"]
