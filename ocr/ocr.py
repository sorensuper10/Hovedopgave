# Importer nødvendige moduler
import os # Bruges til at hente miljøvariabler
import tempfile # Bruges til at oprette midlertidige filer
from fastapi import FastAPI, UploadFile, File # Web framework + filhåndtering
import re # Regulære udtryk til tekstsøgning
from google.cloud import vision # Google Cloud Vision API klient
import io # Bruges til at læse filer som bytes

# Opretter en ny FastAPI-applikation
# Dette objekt fungerer som backend-API, som både hjemmesiden og Android-appen kommunikerer med
# API’en modtager billeder og returnerer OCR-resultater (nummerplade, KM, VIN)
app = FastAPI()

# Henter credentials fra miljøvariabelen 'GOOGLE_APPLICATION_CREDENTIALS_JSON'.
# Dette sikrer, at API-nøgler ikke indlejres direkte i kildekoden.
creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

# Google Vision API kræver en fysisk JSON-fil til servicekontoen.
# Derfor oprettes der midlertidigt en fil, som kun bruges under kørsel

# Gem credentials midlertidigt i en JSON-fil
with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as temp:
    # Konverterer JSON-teksten til bytes og skriver den til filen
    temp.write(creds_json.encode("utf-8"))
    # Gemmer stien til den midlertidige fil
    temp_path = temp.name

# Opret Vision API-klient ved hjælp af servicekontoen
vision_client = vision.ImageAnnotatorClient.from_service_account_file(temp_path)

# Google Vision – nummerplade
def extract_plate_google(image_path):
    #Returnér danske plader: bil, MC, varebil, diplomat, eksport osv.

    # Åbner billedfilen i binær læsetilstand
    with io.open(image_path, "rb") as f:
        # Læser hele billedet som bytes
        content = f.read()

    # Opretter et Vision Image-objekt baseret på billedets byte-indhold
    image = vision.Image(content=content)
    # Sender billedet til Google Vision OCR
    response = vision_client.text_detection(image=image)

    # Afbryder funktionen, hvis Vision API returnerer en fejl
    if response.error.message:
        return None

    # Henter OCR-resultaterne fra Vision-responsen
    annotations = response.text_annotations
    # Returnerer None, hvis ingen tekst blev fundet
    if not annotations:
        return None

    # Konverterer al OCR-tekst til store bogstaver for konsistens
    full_text = annotations[0].description.upper()

    # Fjern alle "KM" og kilometertal fra ocr-resultatet (for at undgå forveksling)
    full_text = re.sub(r"\b\d+[.,]?\d*\s*KM\b", " ", full_text)

    # Definer forskellige danske nummerpladeformater
    patterns = [
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{3})\b",  # Standard bil / MC (AB 12 345)
        r"\b([A-Z]{2})\s*([0-9]{2})\s*([0-9]{2})\b",  # Gul varebil (AB 12 34)
        r"\b([A-Z]{2})\s*([0-9]{4})\b",               # Eksport (AB 1234)
    ]

    # Gennemgå alle mønstre og returnér første gyldige match
    # 'patterns' indeholder forskellige danske nummerpladeformater
    for pat in patterns:
        # Søg efter mønsteret i OCR-teksten
        m = re.search(pat, full_text)
        # Hvis der findes et match
        if m:
            # Udtræk bogstavdelen (typisk de første 2 bogstaver på nummerpladen)
            letters = m.group(1)
            # Saml alle efterfølgende taldele til én samlet streng
            # m.groups()[1:] → alle grupper undtagen den første (bogstavdelen)
            # "".join(...) → sætter dem sammen uden mellemrum, fx '12' + '345' = '12345'
            digits = "".join(m.groups()[1:])
            # Returnér nummerpladen som samlet streng (bogstaver + tal)
            # Fx 'AB12345' eller 'AB1234'
            return letters + digits
    # Returnerer None, hvis ingen nummerplade blev fundet
    return None

# Google Vision – KM tal
def extract_km_google(image_path):
    # Find korrekt kilometertal ved at analysere alle tal og vælge det mest realistiske.

    # Åbner billedet i binær læsetilstand
    with io.open(image_path, "rb") as f:
        # Læser hele billedet som bytes
        content = f.read()

    # Opretter et Vision Image-objekt baseret på billedets byte-indhold
    image = vision.Image(content=content)
    # Sender billedet til Google Vision OCR
    response = vision_client.text_detection(image=image)

    # Afbryder funktionen, hvis Vision API returnerer en fejl
    if response.error.message:
        return None

    # Henter OCR-resultaterne fra Vision-responsen
    annotations = response.text_annotations
    # Returnerer None, hvis ingen tekst blev fundet
    if not annotations:
        return None

    # Samler hele OCR-teksten
    text = annotations[0].description

    # Find alle sekvenser af 3–7 cifre
    all_numbers = re.findall(r"\d{3,7}", text)
    # Returnerer None, hvis ingen tal blev fundet
    if not all_numbers:
        return None

    # Liste til at gemme alle realistiske kilometertal fundet i ocr-teksten
    candidates = []

    # Gennemgå alle fundne tal og filtrér realistiske km-værdier
    for n in all_numbers:
        # Konverter talstrengen til et heltal
        num = int(n)
        # Tjek om tallet ligger inden for et realistisk interval for biler
        # 5000 < num < 500000 → typisk interval for kilometertal
        # Mindre tal kan være fejl eller årstal, større tal er usandsynligt
        if 5000 < num < 500000:
            # Hvis tallet er realistisk, tilføj det til listen over kandidater
            candidates.append(num)
            # Hvis ingen realistiske kilometertal blev fundet, returnér None
    if not candidates:
        return None
    # Returnér det største tal (typisk det rigtige kilometertal)
    return max(candidates)

# Google Vision – Stelnummer (VIN)
def extract_vin_google(image_path):
    # Find stelnummer (VIN) og undgå alle instrumentbræt-tal.

    # Åbner billedet i binær læsetilstand
    with io.open(image_path, "rb") as f:
        # Læser hele billedet som bytes
        content = f.read()

    # Opretter et Vision Image-objekt baseret på billedets byte-indhold
    image = vision.Image(content=content)
    # Sender billedet til Google Vision OCR
    response = vision_client.text_detection(image=image)

    # Afbryder funktionen, hvis Vision API returnerer en fejl
    if response.error.message:
        return None

    # Henter OCR-resultaterne fra Vision-responsen
    annotations = response.text_annotations
    # Returnerer None, hvis ingen tekst blev fundet
    if not annotations:
        return None

    # Samler al tekst og konverterer til store bogstaver
    text = annotations[0].description.upper()

    # Fjerner mellemrum og linjeskift
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
    # Søger efter første forekomst af mønsteret i OCR-teksten
    match = re.search(vin_pattern, text)
    # Hvis ingen match findes → returnér None (ingen VIN fundet)
    if not match:
        return None
    # Udtrækker det matchede VIN fra match-objektet
    vin = match.group(0)
    # Ekstra validering: udeluk rene talstrenge med 5 eller flere cifre
    if re.match(r"^\d{5,}$", vin):
        return None
    # Returnér det endelige VIN-nummer
    return vin

# FastAPI endpoint
@app.post("/ocr")
async def ocr_scan(image: UploadFile = File(...)):
    # Modtag billede → kør ocr → returnér nummerplade, km-tal og stelnummer.
    try:
        # Læser det uploadede billede
        content = await image.read()
        # Gemmer billedet midlertidigt på serveren
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