from fastapi import FastAPI, UploadFile, File
import easyocr
import cv2
import numpy as np
import re

app = FastAPI()

reader = easyocr.Reader(['en'], gpu=False)

def auto_crop_plate(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return None  # fallback

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Edge detection
    edges = cv2.Canny(gray, 100, 200)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Sort the largest contours first
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for cnt in contours[:15]:  # check top 15 biggest shapes
        x, y, w, h = cv2.boundingRect(cnt)

        aspect_ratio = w / float(h)

        # Nummerplader er lange
        if 2.0 < aspect_ratio < 6.0 and w > 100:
            crop = img[y:y+h, x:x+w]
            temp_path = "crop.jpg"
            cv2.imwrite(temp_path, crop)
            return temp_path

    return None  # nothing found


@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        content = await image.read()

        with open("temp.jpg", "wb") as f:
            f.write(content)

        # === AUTO CROP ===
        crop_path = auto_crop_plate("temp.jpg")

        # choose the best image
        image_to_read = crop_path if crop_path else "temp.jpg"

        # OCR
        result = reader.readtext(image_to_read, detail=0)

        # Clean for plate
        cleaned = [re.sub(r'[^A-Za-z0-9]', '', txt).upper() for txt in result]
        combined = "".join(cleaned)

        plate = None
        m = re.search(r'[A-Z]{2}[0-9]{5}', combined)
        if m:
            plate = m.group(0)

        # KM fallback
        km = None
        if not plate:
            digits = "".join(re.sub(r'[^0-9]', '', txt) for txt in result)
            km_match = re.search(r'\d{5,7}', digits)
            if km_match:
                km = km_match.group(0)

        return {
            "raw_text": result,
            "detected_plate": plate,
            "detected_km": km,
            "auto_crop_used": crop_path is not None
        }

    except Exception as e:
        return {"error": str(e)}
