# --- 1. Base image (Python 3.10 – stabilt og let) ---
FROM python:3.10-slim

# --- 2. Arbejdsmappe ---
WORKDIR /app

# --- 3. Kopiér projektfiler ---
COPY ocr /app

# --- 4. Installér nødvendige Python-pakker ---
RUN pip install --upgrade pip
RUN pip install fastapi uvicorn python-multipart google-cloud-vision protobuf==4.25.1

# --- 5. Expose port 8000 ---
EXPOSE 8000

# --- 6. Start FastAPI server ---
CMD ["uvicorn", "ocr:app", "--host", "0.0.0.0", "--port", "8000"]