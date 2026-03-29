FROM python:3.10-slim

# Install system deps for OpenCV + Tesseract (fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 tesseract-ocr curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download EasyOCR models so first request isn't slow
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False, verbose=False)"

# Node deps
COPY package.json .
RUN npm install --production

# App code
COPY detect.py server.js ./

# Create uploads dir
RUN mkdir -p uploads

EXPOSE 5050

CMD ["node", "server.js"]
