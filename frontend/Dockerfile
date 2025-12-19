FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm install --production
EXPOSE 54321
CMD ["npm", "run", "prod"]

# Stage for nginx (optional) 
#FROM nginx:alpine AS production
#COPY --from=build /app/dist /usr/share/nginx/html
#COPY nginx.conf /etc/nginx/conf.d/default.conf
#EXPOSE 54321
#CMD ["nginx", "-g", "daemon off;"]