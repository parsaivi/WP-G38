FROM node:18-alpine

WORKDIR /app

# Build arguments for React environment variables
ARG REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Copy files
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
