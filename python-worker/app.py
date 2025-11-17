from fastapi import FastAPI, UploadFile, File
import easyocr
import re

app = FastAPI()
reader = easyocr.Reader(['en'], gpu=False)

@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    content = await image.read()

    try:
        # Gem billede midlertidigt
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # Kør OCR
        result = reader.readtext("temp.jpg", detail=0)

        # Lav nummerplade forsøg
        cleaned_alnum = "".join([
            re.sub(r'[^A-Za-z0-9]', '', txt).upper()
            for txt in result
        ])

        plate = None
        plate_match = re.search(r'[A-Z]{2}[0-9]{5}', cleaned_alnum)
        if plate_match:
            plate = plate_match.group(0)

        # KM-tal hvis ingen nummerplade
        km = None
        if not plate:
            digits = "".join(re.sub(r'[^0-9]', '', txt) for txt in result)
            km_match = re.search(r'\d{5,7}', digits)
            if km_match:
                km = km_match.group(0)

        return {
            "raw_text": result,
            "detected_plate": plate,
            "detected_km": km
        }

    except Exception as e:
        return {"error": str(e)}
