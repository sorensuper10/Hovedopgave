import os
import tempfile
from fastapi import FastAPI, UploadFile, File
import re
from google.cloud import vision
import io

app = FastAPI()

# === Google Vision credentials ===
creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp:
    temp.write(creds_json.encode("utf-8"))
    temp_path = temp.name

vision_client = vision.ImageAnnotatorClient.from_service_account_file(temp_path)

# Google Vision – Nummerplade OCR
def extract_plate_google(image_path):
    """Returnér dansk nummerplade (AA12345) ved hjælp af Google Vision OCR."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    # Hele OCR-teksten
    full_text = annotations[0].description

    # 1) Fjern "km" enheder
    full_text = re.sub(r"\b\d+[.,]?\d*\s*km\b", " ", full_text, flags=re.IGNORECASE)

    # 2) Find dansk nummerplade med eller uden mellemrum
    match = re.search(r"\b([A-Z]{2})\s*([0-9]{5})\b", full_text, flags=re.IGNORECASE)

    if not match:
        return None

    letters = match.group(1).upper()
    digits = match.group(2)

    return letters + digits

# Google Vision – KM OCR
def extract_km_google(image_path):
    """Returnér det STØRSTE tal fra Vision OCR = odometer."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    words = annotations[0].description.split()

    numbers = []
    for w in words:
        cleaned = re.sub(r"[^0-9]", "", w)
        if cleaned.isdigit():
            numbers.append(int(cleaned))

    if not numbers:
        return None

    return max(numbers)

# FastAPI endpoint – Bruger Google Vision
@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        # Gem uploadet billede midlertidigt
        content = await image.read()

        with open("temp.jpg", "wb") as f:
            f.write(content)

        # Nummerplade (Google Vision)
        plate = extract_plate_google("temp.jpg")

        # KM — Kun hvis ingen nummerplade
        km = None
        if plate is None:
            km = extract_km_google("temp.jpg")

        return {
            "detected_plate": plate if plate else "",
            "detected_km": km if km else ""
        }

    except Exception as e:
        return {"error": str(e)}