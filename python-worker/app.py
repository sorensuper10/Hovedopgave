from fastapi import FastAPI, UploadFile, File
import easyocr
import re
import json

app = FastAPI()

# --- Opret EasyOCR reader én gang ---
reader = easyocr.Reader(['en'], gpu=False)


@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    try:
        # --- Læs filen ---
        content = await image.read()

        # --- Gem temp billede ---
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # --- Kør OCR ---
        result = reader.readtext("temp.jpg", detail=0)  # detail=0 = kun tekst

        # --- 4. Rens til nummerplade ---
        cleaned_alnum_words = [
            re.sub(r'[^A-Za-z0-9]', '', txt).upper()
            for txt in result
        ]
        combined_alnum = "".join(cleaned_alnum_words)

        plate = None
        plate_match = re.search(r'[A-Z]{2}[0-9]{5}', combined_alnum)
        if plate_match:
            plate = plate_match.group(0)

        # --- 5. Rens til KM-tal ---
        km = None
        if not plate:
            digits_only = "".join(
                re.sub(r'[^0-9]', '', txt) for txt in result
            )
            km_match = re.search(r'\d{5,7}', digits_only)
            if km_match:
                km = km_match.group(0)

        # --- 6. Returner OCR-resultat ---
        return {
            "raw_text": result,
            "detected_plate": plate,
            "detected_km": km
        }

    except Exception as e:
        return {"error": str(e)}
