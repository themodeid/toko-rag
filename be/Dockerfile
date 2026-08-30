# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./dist/database/migrations
COPY --from=builder /app/uploads ./uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const url='http://localhost:5000/api/health';const req=http.get(url,(res)=>{const ok=res.statusCode===200;res.resume();res.on('end',()=>process.exit(ok?0:1));});req.setTimeout(2000,()=>{req.destroy();process.exit(1);});req.on('error',()=>process.exit(1));"

CMD ["node", "dist/app.js"]
