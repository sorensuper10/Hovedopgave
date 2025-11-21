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


# ===============================================================
# GOOGLE VISION – NUMMERPLADE
# ===============================================================
def extract_plate_google(image_path):
    """Returnér danske plader: bil, MC, varebil, diplomat, eksport osv."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    full_text = annotations[0].description.upper()

    # Fjern KM-enheder fra OCR
    full_text = re.sub(r"\b\d+[.,]?\d*\s*KM\b", " ", full_text)

    # Nummerplade-formater
    patterns = [
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{3})\b",  # Standard bil (AB 12 345)
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{2})\b",  # Gul varebil (AB 12 34)
        r"\b([A-Z]{2})\s*([0-9]{3})\b",               # MC (AB 123)
        r"\b([A-Z]{2})\s*([0-9]{4})\b",               # Eksport (AB 1234)
    ]

    for pat in patterns:
        m = re.search(pat, full_text)
        if m:
            letters = m.group(1)
            digits = "".join(m.groups()[1:])

            # Undgå "KMxxxxx" falske plader
            if letters == "KM":
                continue

            return letters + digits

    return None


# ===============================================================
# GOOGLE VISION – KM
# ===============================================================
def extract_km_google(image_path):
    """Find realistisk km-tal: 4–7 cifre (undgår VIN, speedometer m.m.)."""
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

        # KM-tal er typisk 4–7 cifre
        if len(cleaned) < 4 or len(cleaned) > 7:
            continue

        if cleaned.isdigit():
            numbers.append(int(cleaned))

    if not numbers:
        return None

    return max(numbers)


# ===============================================================
# GOOGLE VISION – VIN
# ===============================================================
def extract_vin_google(image_path):
    """Find 17-tegns VIN (stelnummer)."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    text = annotations[0].description.upper().replace(" ", "").replace("\n", "")

    vin_pattern = r"[A-HJ-NPR-Z0-9]{17}"  # VIN uden I, O, Q

    match = re.search(vin_pattern, text)
    return match.group(0) if match else None


# ===============================================================
# FASTAPI ENDPOINT
# ===============================================================
@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        # Gem midlertidigt billede
        content = await image.read()
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # Kør alle tre funktioner
        plate = extract_plate_google("temp.jpg")
        vin   = extract_vin_google("temp.jpg")
        km    = extract_km_google("temp.jpg")

        return {
            "detected_plate": plate or "",
            "detected_km": km or "",
            "detected_vin": vin or ""
        }

    except Exception as e:
        return {"error": str(e)}
