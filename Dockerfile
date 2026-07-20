FROM node:latest AS build

ENV NODE_ENV=development

WORKDIR /home/node/app

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

USER node

COPY package.json ./

RUN npm i --ignore-scripts

COPY --chown=node:node . .

RUN npx tsc --noCheck

FROM node:latest

ENV NODE_ENV=production

WORKDIR /home/node/app

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

USER node

COPY package.json ./

RUN npm i --omit=dev
 #--ignore-scripts && npm rebuild sqlite3 --build-from-source

COPY --from=build --chown=node:node /home/node/app/dist ./dist

COPY ./config /home/node/app/config

RUN mkdir -p database/

EXPOSE 5000

CMD [ "node","dist/index.js" ]

# FROM node:lts

# ENV NODE_ENV=production

# WORKDIR /home/node/app

# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# USER node

# COPY package.json ./

# RUN npm i

# COPY --chown=node:node . .

# RUN mkdir -p database/

# EXPOSE 5000

# CMD [ "node","src/index.js" ]