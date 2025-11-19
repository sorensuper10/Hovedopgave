import os
import tempfile
from fastapi import FastAPI, UploadFile, File
import easyocr
import cv2
import re
from google.cloud import vision
import io

app = FastAPI()

# === EasyOCR til nummerplader ===
reader = easyocr.Reader(['en'], gpu=False)

# === Google Vision credentials ===
creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp:
    temp.write(creds_json.encode("utf-8"))
    temp_path = temp.name

vision_client = vision.ImageAnnotatorClient.from_service_account_file(temp_path)


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
    with io.open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)
    response = vision_client.text_detection(image=image)

    if response.error.message:
        return None, []

    annotations = response.text_annotations
    if not annotations:
        return None, []

    words = annotations[0].description.split()
    raw_google = words[:]  # GEM RAW GOOGLE OCR

    lower_words = [w.lower() for w in words]

    # TRIP MODE
    if "km" in lower_words:
        km_index = lower_words.index("km")
        before = words[:km_index]

        if len(before) >= 2:
            combined = before[-2] + before[-1]
            m = re.search(r"\d+\.\d+", combined)
            if m:
                return m.group(0), raw_google

        m = re.search(r"\d+\.\d+", " ".join(before))
        if m:
            return m.group(0), raw_google

        return None, raw_google

    # ODOMETER MODE
    cleaned = [re.sub(r"[^0-9]", "", w) for w in words]
    combined = "".join(cleaned)

    m = re.search(r"\d{5,7}", combined)
    if m:
        return m.group(0), raw_google

    return None, raw_google


@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        content = await image.read()

        with open("temp.jpg", "wb") as f:
            f.write(content)

        # === 1️⃣ NUMMERPLADE ===
        crop_path = auto_crop_plate("temp.jpg")
        plate_image = crop_path if crop_path else "temp.jpg"

        plate_raw = reader.readtext(plate_image, detail=0)
        cleaned_plate = [re.sub(r'[^A-Za-z0-9]', '', t).upper() for t in plate_raw]
        merged_plate = "".join(cleaned_plate)

        plate = None
        m = re.search(r"[A-Z]{2}[0-9]{5}", merged_plate)
        if m:
            plate = m.group(0)

        # === 2️⃣ KM (kun hvis ingen nummerplade fundet) ===
        km = None
        raw_km_ocr = []

        if plate is None:
            km, raw_km_ocr = extract_km_google("temp.jpg")

        # === OUTPUT ===
        return {
            "detected_plate": plate if plate else "",
            "detected_km": km if km else "",
            "raw_ocr": plate_raw if plate else raw_km_ocr
        }

    except Exception as e:
        return {"error": str(e)}