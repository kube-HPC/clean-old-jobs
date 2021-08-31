ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}node:14.5.0 as install
ADD ./package-lock.json ./package.json /hkube/cleaner/
WORKDIR /hkube/cleaner
RUN npm ci --production


ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}hkube/base-node:v1.2.0
LABEL maintainer="yehiyam@gmail.com"
RUN mkdir /hkube
COPY . /hkube/cleaner
COPY --from=install /hkube/cleaner/node_modules /hkube/cleaner/node_modules
WORKDIR /hkube/cleaner
CMD ["node", "app.js"]
