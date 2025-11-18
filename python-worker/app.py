import os
import tempfile
import io
import re
import cv2
import easyocr
import numpy as np
from fastapi import FastAPI, UploadFile, File
from google.cloud import vision

app = FastAPI()

# === EasyOCR til nummerplader ===
reader = easyocr.Reader(['en'], gpu=False)

# === GOOGLE CREDENTIALS FRA RAILWAY ENV ===
creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

if creds_json is None:
    raise Exception("❌ Railway environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON mangler!")

with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp:
    temp.write(creds_json.encode("utf-8"))
    temp_path = temp.name

vision_client = vision.ImageAnnotatorClient.from_service_account_file(temp_path)


# 🔍 Auto-crop af nummerplade
def auto_crop_plate(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for cnt in contours[:15]:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h)

        if 2.0 < aspect_ratio < 6.0 and w > 100:
            crop = img[y:y + h, x:x + w]
            temp_path = "crop.jpg"
            cv2.imwrite(temp_path, crop)
            return temp_path

    return None


# 🔧 KM-detektion (med anti-falsk-positiv filter)
def extract_km_google(image_path, plate_digits=None):
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
    lower_words = [w.lower() for w in words]

    # === TRIP METER MODE (indeholder "km") ===
    if "km" in lower_words:
        km_index = lower_words.index("km")
        before = words[:km_index]

        if len(before) >= 2:
            combined = before[-2] + before[-1]
            m = re.search(r"\d+\.\d+", combined)
            if m:
                return m.group(0)

        joined = " ".join(before)
        m = re.search(r"\d+\.\d+", joined)
        if m:
            return m.group(0)

        return None

    # === ODOMETER MODE ===
    cleaned = [re.sub(r"[^0-9]", "", w) for w in words]
    combined = "".join(cleaned)

    m = re.search(r"\d{5,7}", combined)
    if not m:
        return None

    km_candidate = m.group(0)

    # ❌ Bloker hvis KM matcher nummerpladens tal
    if plate_digits and km_candidate == plate_digits:
        return None

    # ❌ Hvis tallet er for lille til at være et km-tal
    if int(km_candidate) < 1000:
        return None

    return km_candidate


@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        content = await image.read()

        with open("temp.jpg", "wb") as f:
            f.write(content)

        # === Auto-crop af plade ===
        crop_path = auto_crop_plate("temp.jpg")
        plate_image = crop_path if crop_path else "temp.jpg"

        # === Nummerplade OCR ===
        plate_raw_full = reader.readtext(plate_image, detail=1)

        # Raw OCR som tekstliste (fx: ["DK", "CV", "90", "593"])
        plate_raw_list = [item[1] for item in plate_raw_full]

        # Rens og saml nummerpladen
        cleaned_plate = [re.sub(r"[^A-Za-z0-9]", "", t).upper() for t in plate_raw_list]
        combined_plate = "".join(cleaned_plate)

        plate = None
        plate_digits = None

        m = re.search(r"[A-Z]{2}([0-9]{5})", combined_plate)
        if m:
            plate = m.group(0)
            plate_digits = m.group(1)

        # === KM-detektion ===
        km = extract_km_google("temp.jpg", plate_digits)

        return {
            "raw_plate_text": plate_raw_list,
            "detected_plate": plate,
            "detected_km": km,
            "auto_crop_used": crop_path is not None
        }

    except Exception as e:
        return {"error": str(e)}
