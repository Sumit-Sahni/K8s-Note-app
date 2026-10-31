# Start from a small Linux image that already has Node.js
FROM node:26-alpine3.23

WORKDIR /app

# Copy the one file (nothing to install)
COPY server.js ./

# Don't run as root
USER node

EXPOSE 3000
CMD ["node", "server.js"]
