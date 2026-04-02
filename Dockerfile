FROM node:lts AS build

ENV NODE_ENV=developpement

WORKDIR /home/node/app

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

USER node

COPY package.json ./

RUN npm i

COPY --chown=node:node . .

RUN npx tsc

FROM node:lts

ENV NODE_ENV=production

WORKDIR /home/node/app

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

USER node

COPY package.json ./

RUN npm i

COPY --from=build --chown=node:node /home/node/app/dist ./src

COPY ./config /home/node/app/config

RUN mkdir -p database/

EXPOSE 5000

CMD [ "node","src/index.js" ]

