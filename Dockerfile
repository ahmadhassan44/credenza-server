FROM node:20-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Generate Prisma client
RUN npx prisma generate

RUN npm run build

FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

# Copy built app
COPY --from=development /usr/src/app/dist ./dist

# Copy Prisma files
COPY --from=development /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=development /usr/src/app/generated ./generated

# Copy Prisma schema for potential migrations
COPY --from=development /usr/src/app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main"]