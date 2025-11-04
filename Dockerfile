FROM node:18-alpine

WORKDIR /app

# Install only production dependencies using lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]


