FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

ENV PORT=3000
EXPOSE 3000

# داده‌های زمان اجرا بیرون از ایمیج نگه داشته شوند
VOLUME ["/app/data", "/app/public/uploads"]

CMD ["node", "server.js"]
