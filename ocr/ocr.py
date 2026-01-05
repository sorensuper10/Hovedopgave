# Importer nødvendige moduler
import os # Bruges til at hente miljøvariabler
import tempfile # Bruges til at oprette midlertidige filer
from fastapi import FastAPI, UploadFile, File # Web framework + filhåndtering
import re # Regulære udtryk til tekstsøgning
from google.cloud import vision # Google Cloud Vision API klient
import io # Bruges til at læse filer som bytes

# Initialiserer en ny FastAPI-serverinstans
app = FastAPI()

# Google Vision credentials
creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

# Gem credentials midlertidigt i en .json-fil
with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp:
    temp.write(creds_json.encode("utf-8"))
    temp_path = temp.name

# Opret Vision API-klient ved hjælp af servicekontoen
vision_client = vision.ImageAnnotatorClient.from_service_account_file(temp_path)

# Google Vision – nummerplade
def extract_plate_google(image_path):
    #Returnér danske plader: bil, MC, varebil, diplomat, eksport osv.

    # Læs billedet som bytes
    with io.open(image_path, "rb") as f:
        content = f.read()

    # Opret Vision Image-objekt
    image = vision.Image(content=content)
    # Kald Google Vision ocr-funktion
    response = vision_client.text_detection(image=image)

    # Stop hvis Vision returnerer fejl
    if response.error.message:
        return None

    # Hent tekstresultater (annotations)
    annotations = response.text_annotations
    if not annotations:
        return None

    # Konverter al tekst til store bogstaver for konsistens
    full_text = annotations[0].description.upper()

    # Fjern alle "KM" og kilometertal fra ocr-resultatet (for at undgå forveksling)
    full_text = re.sub(r"\b\d+[.,]?\d*\s*KM\b", " ", full_text)

    # Definer forskellige danske nummerpladeformater
    patterns = [
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{3})\b",  # Standard bil (AB 12 345)
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{2})\b",  # Gul varebil (AB 12 34)
        r"\b([A-Z]{2})\s*([0-9]{3})\b",               # MC (AB 123)
        r"\b([A-Z]{2})\s*([0-9]{4})\b",               # Eksport (AB 1234)
    ]

    # Gennemgå alle mønstre og returnér første gyldige match
    for pat in patterns:
        m = re.search(pat, full_text)
        if m:
            letters = m.group(1) # Bogstavdel
            digits = "".join(m.groups()[1:]) # Saml taldelen
            # Spring over falske matches som starter med "KM"
            if letters == "KM":
                continue
            return letters + digits # Returnér fundet nummerplade
    # Hvis intet match findes → returnér None
    return None

# Google Vision – KM tal
def extract_km_google(image_path):
    # Find korrekt kilometertal ved at analysere alle tal og vælge det mest realistiske.

    # Læs billedet som bytes
    with io.open(image_path, "rb") as f:
        content = f.read()

    # Opret Vision Image-objekt
    image = vision.Image(content=content)
    # Kald Google Vision ocr-funktion
    response = vision_client.text_detection(image=image)

    # Stop hvis Vision returnerer fejl
    if response.error.message:
        return None

    # Hent tekstresultater (annotations)
    annotations = response.text_annotations
    if not annotations:
        return None

    # Saml hele teksten
    text = annotations[0].description

    # Find alle sekvenser af 3–7 cifre
    all_numbers = re.findall(r"\d{3,7}", text)
    if not all_numbers:
        return None

    # Liste til at gemme alle realistiske kilometertal fundet i ocr-teksten
    candidates = []

    # Gennemgå alle fundne tal og filtrér realistiske km-værdier
    for n in all_numbers:
        num = int(n)
        if 5000 < num < 500000:     # Typisk interval for bilers kilometertal
            candidates.append(num)
    if not candidates:
        return None
    # Returnér det største tal (typisk det rigtige kilometertal)
    return max(candidates)

# Google Vision – Stelnummer (VIN)
def extract_vin_google(image_path):
    # Find stelnummer (VIN) og undgå alle instrumentbræt-tal.

    # Læs billedet som bytes
    with io.open(image_path, "rb") as f:
        content = f.read()

    # Opret Vision Image-objekt
    image = vision.Image(content=content)
    # Kald Google Vision ocr-funktion
    response = vision_client.text_detection(image=image)

    # Stop hvis Vision returnerer fejl
    if response.error.message:
        return None

    # Hent tekstresultater (annotations)
    annotations = response.text_annotations
    if not annotations:
        return None

    # Saml hele teksten
    text = annotations[0].description.upper()

    # Fjern whitespace
    text = text.replace(" ", "").replace("\n", "")

    # Fjern støj (km-tal, hastighed, “TRIP”, “STOP” osv.)
    text = re.sub(r"\bKM[0-9A-Z]*", "", text) # Fjerner alt der starter med 'KM' efterfulgt af bogstaver/tal (f.eks. KM1234, KMST, KMT osv.)
    text = re.sub(r"\b[0-9]{4,7}\b", "", text) # Fjerner større tal (4-7 cifre), typisk kilometertæller eller andre displaytal
    text = re.sub(r"[0-9]{1,3}KMH", "", text)  # Fjerner mønstre som "120KMH" (hastighedsvisning)
    text = re.sub(r"[0-9]{1,3}KMT", "", text) # Fjerner mønstre som "80KMT" (variation af hastighedsvisning)
    text = re.sub(r"STOP", "", text) # Fjerner ordet "STOP" (instrumentbræt-indikator)
    text = re.sub(r"TRIP", "", text) # Fjerner ordet "TRIP" (tripmåler på instrumentbrættet)

    # VIN-format: præcis 17 tegn (A–Z, 0–9, men uden I/O/Q)
    vin_pattern = r"\b[A-HJ-NPR-Z0-9]{17}\b"
    match = re.search(vin_pattern, text)
    if not match:
        return None
    vin = match.group(0)
    # Ekstra sikkerhed: stelnummer må ikke starte eller slutte med tal fra instrumentbrættet
    if re.match(r"^\d{5,}$", vin):
        return None
    return vin

# FastAPI endpoint
@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    # Modtag billede → kør ocr → returnér plade, km og stelnummer.
    try:
        # Gem upload midlertidigt
        content = await image.read()
        with open("temp.jpg", "wb") as f:
            f.write(content)

        # Forsøg at finde stelnummer først
        vin = extract_vin_google("temp.jpg")

        # Forsøg at finde nummerplade
        plate = extract_plate_google("temp.jpg")

        # Kun hvis INGEN af delene findes, tjek for kilometertal
        km = None
        if vin is None and plate is None:
            km = extract_km_google("temp.jpg")

        # Returnér resultat som JSON
        return {
            "detected_plate": plate or "",
            "detected_km": km or "",
            "detected_vin": vin or ""
        }
        # Fejlhåndtering (returnér fejlbesked som JSON)
    except Exception as e:
        return {"error": str(e)}