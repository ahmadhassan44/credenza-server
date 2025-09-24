FROM node

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run db:generate

RUN npm run build

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "start:prod" ]