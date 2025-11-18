from fastapi import FastAPI, UploadFile, File
import easyocr
import cv2
import numpy as np
import re
from google.cloud import vision
import io

app = FastAPI()

# Nummerplader → EasyOCR
reader = easyocr.Reader(['en'], gpu=False)

# KM → Google Vision
vision_client = vision.ImageAnnotatorClient()


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


def extract_km_google(image_path):
    """ KM-detektion (Vision OCR kode) """

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

    # ----- TRIP METER MODE -----
    if "km" in lower_words:
        km_index = lower_words.index("km")
        before = words[:km_index]

        # Saml "2" + "13.3" → "213.3"
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

    # ----- ODOMETER MODE -----
    cleaned = [re.sub(r"[^0-9]", "", w) for w in words]
    combined = "".join(cleaned)

    m = re.search(r"\d{5,7}", combined)
    if m:
        return m.group(0)

    return None


@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        content = await image.read()

        with open("temp.jpg", "wb") as f:
            f.write(content)

        # === 1️⃣ AUTO CROP + NUMMERPLADE ===
        crop_path = auto_crop_plate("temp.jpg")
        plate_image = crop_path if crop_path else "temp.jpg"

        # Nummerplade OCR
        plate_raw = reader.readtext(plate_image, detail=0)
        cleaned_plate = [re.sub(r'[^A-Za-z0-9]', '', t).upper() for t in plate_raw]
        combined_plate = "".join(cleaned_plate)

        plate = None
        m = re.search(r"[A-Z]{2}[0-9]{5}", combined_plate)
        if m:
            plate = m.group(0)

        # === 2️⃣ KM DETEKTION (Google Vision) ===
        km = extract_km_google("temp.jpg")

        # RETURN
        return {
            "raw_plate_text": plate_raw,
            "detected_plate": plate,
            "detected_km": km,
            "auto_crop_used": crop_path is not None
        }

    except Exception as e:
        return {"error": str(e)}