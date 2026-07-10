FROM node:22-alpine

WORKDIR /app

# Install ffmpeg + python + yt-dlp
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip

RUN pip3 install --break-system-packages yt-dlp

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]