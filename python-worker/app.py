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
    """Find kilometertal: længste rene talsekvens fra instrumentbræt."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    text = annotations[0].description

    # Find alle rene tal (ingen bogstaver)
    all_numbers = re.findall(r"\b\d{4,7}\b", text)

    if not all_numbers:
        return None

    # returnér det længste tal
    return max(all_numbers, key=len)

# ===============================================================
# GOOGLE VISION – VIN
# ===============================================================
def extract_vin_google(image_path):
    """Finder stelnummer (VIN) og undgår at forveksle det med kilometertal."""
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None

    annotations = response.text_annotations
    if not annotations:
        return None

    text = annotations[0].description.upper()

    # Fjern mellemrum og linjeskift
    text = text.replace(" ", "").replace("\n", "")

    # Fjern ting som Google ofte læser på instrumentbræt
    text = re.sub(r"\bKM[0-9A-Z]*", "", text)       # fjerner 'KM136367', 'KMST', osv.
    text = re.sub(r"[0-9]{4,7}", "", text)          # fjern store tal (km-display)
    text = re.sub(r"[0-9]{1,3}KMH", "", text)       # fjern hastighed
    text = re.sub(r"[0-9]{1,3}KM/T", "", text)

    # VIN regex (17 tegn – ingen I, O, Q)
    vin_pattern = r"[A-HJ-NPR-Z0-9]{17}"
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