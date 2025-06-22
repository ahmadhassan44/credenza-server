#stage 1
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json  ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

#stage 2
FROM alpine:latest AS production

WORKDIR /app    

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "start:prod" ]   