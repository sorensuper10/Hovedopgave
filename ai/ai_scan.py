import sys
import easyocr
import json
import re

# --- 1. Modtag billedsti ---
if len(sys.argv) < 2:
    print(json.dumps({"error": "No image path provided"}))
    sys.exit(1)

image_path = sys.argv[1]

# --- 2. Opret OCR-læser ---
reader = easyocr.Reader(['en'], gpu=False)

# --- 3. Kør OCR ---
try:
    result = reader.readtext(image_path, detail=0)
except Exception as e:
    print(json.dumps({"error": f"OCR failed: {str(e)}"}))
    sys.exit(1)

# result er fx: ["DK", "HG 30,202"]

# --- 4. Rens tekst til nummerplade (bogstaver+tal) ---
cleaned_alnum_words = [re.sub(r'[^A-Za-z0-9]', '', txt).upper() for txt in result]
combined_alnum = "".join(cleaned_alnum_words)
# fx: ["DK", "HG30202"] -> "DKHG30202"

plate = None
plate_match = re.search(r'[A-Z]{2}[0-9]{5}', combined_alnum)
if plate_match:
    plate = plate_match.group(0)

# --- 5. Rens tekst til KM (kun tal) ---
km = None

# Vi vil kun lede efter KM-tal, hvis vi IKKE fandt en nummerplade
if not plate:
    digits_only = "".join(re.sub(r'[^0-9]', '', txt) for txt in result)
    # fx fra et KM-billede: "151517"
    km_match = re.search(r'\d{5,7}', digits_only)
    if km_match:
        km = km_match.group(0)

# --- 6. Returner JSON ---
output = {
    "raw_text": result,
    "detected_plate": plate,
    "detected_km": km
}

print(json.dumps(output))
