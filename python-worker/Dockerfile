# --- 1. Base image (Python 3.10 = stabile wheels til Torch) ---
FROM python:3.10-slim

# --- 2. System dependencies for OpenCV + EasyOCR ---
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# --- 3. Arbejdsmappe ---
WORKDIR /app

# --- 4. Kopiér Python-filer ---
COPY . /app

# --- 5. Installér Python dependencies (men vi gør Torch nemmere) ---
RUN pip install --upgrade pip

# Torch CPU version (hurtigere + mindre)
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# EasyOCR + FastAPI + Uvicorn
RUN pip install easyocr fastapi uvicorn python-multipart opencv-python-headless

# --- 6. Expose port 8000 ---
EXPOSE 8000

# --- 7. Start python worker ---
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]