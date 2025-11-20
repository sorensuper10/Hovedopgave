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
    """Returnér alle typer danske nummerplader (bil, MC, varebil, diplomat, el osv.)."""
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

    # 1) Fjern "km" enheder
    full_text = re.sub(r"\b\d+[.,]?\d*\s*KM\b", " ", full_text)

    # 2) Mulige danske plade-formater (i rækkefølge)
    patterns = [
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{3})\b",  # Standard bilplade (AA 12 345)
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{2})\b",  # GUL varebilplade (AA 12 34)
        r"\b([A-Z]{2})\s*([0-9]{3})\b",               # MC-plade (AA 123)
        r"\b([A-Z]{2})\s*([0-9]{4})\b",               # Export (AA 1234)
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

# Google Vision – Stelnummer (VIN)
def extract_vin_google(image_path):
    """Returnér 17-tegns VIN / stelnummer fra Google Vision OCR."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    # Saml alt tekst, fjern mellemrum og linjeskift
    text = annotations[0].description.upper()
    text = text.replace(" ", "").replace("\n", "")

    # VIN-regex (ingen I, O, Q)
    vin_pattern = r"[A-HJ-NPR-Z0-9]{17}"

    match = re.search(vin_pattern, text)
    return match.group(0) if match else None

# FastAPI endpoint – Bruger Google Vision
@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        # Gem uploadet billede
        content = await image.read()
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # Nummerplade
        plate = extract_plate_google("temp.jpg")

        # Stelnummer (VIN)
        vin = extract_vin_google("temp.jpg")

        # KM (kun hvis ingen nummerplade og ingen vin)
        km = None
        if plate is None and vin is None:
            km = extract_km_google("temp.jpg")

        return {
            "detected_plate": plate if plate else "",
            "detected_km": km if km else "",
            "detected_vin": vin if vin else ""
        }

    except Exception as e:
        return {"error": str(e)}