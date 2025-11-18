from fastapi import FastAPI, UploadFile, File
import easyocr
import re

app = FastAPI()

reader = easyocr.Reader(['en'], gpu=False)

@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        # Gem billede
        content = await image.read()
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # OCR - præcis som PyCharm
        result = reader.readtext("temp.jpg", detail=0)

        # --- Nummerplade logik (PyCharm style) ---
        cleaned_words = [
            re.sub(r'[^A-Za-z0-9]', '', txt).upper()
            for txt in result
        ]
        combined = "".join(cleaned_words)

        plate = None
        match = re.search(r'[A-Z]{2}[0-9]{5}', combined)
        if match:
            plate = match.group(0)

        # --- KM logik (kør kun hvis der IKKE er nummerplade) ---
        km = None
        if not plate:
            digits_only = "".join(re.sub(r'[^0-9]', '', txt) for txt in result)
            km_match = re.search(r'\d{5,7}', digits_only)
            if km_match:
                km = km_match.group(0)

        return {
            "raw_text": result,
            "combined": combined,
            "detected_plate": plate,
            "detected_km": km
        }

    except Exception as e:
        return {"error": str(e)}
