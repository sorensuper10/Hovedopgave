// Når brugeren vælger et billede, vises en forhåndsvisning
document.getElementById("imageInput").addEventListener("change", function () {
    const file = this.files[0]; // Hent første valgte fil
    if (!file) return; // Stopper funktionen hvis ingen fil er valgt

    const reader = new FileReader(); // Opret FileReader til at læse billedet
    // Når filen er færdig læst
    reader.onload = (e) => {
        // Sætter billedets Base64-data som kilde for preview-billedet
        document.getElementById("previewImage").src = e.target.result;
        // Gør preview-containeren synlig
        document.getElementById("previewContainer").style.display = "block";
    };
    reader.readAsDataURL(file); // Læs billedet som Base64-data
});

// Send billede til /scan (ocr)
// Når brugeren trykker på "Scan billede"-knappen
document.getElementById("scanBtn").addEventListener("click", async () => {
    const fileInput = document.getElementById("imageInput");

    // Sikr at der er valgt et billede
    if (!fileInput.files.length) {
        alert("Vælg et billede først!");
        return;
    }

    // Opretter FormData til upload af billedet
    const formData = new FormData();
    formData.append("image", fileInput.files[0]); // Tilføjer billedfilen

    // Viser loading-tekst og skjuler tidligere resultater
    document.getElementById("loading").style.display = "block";
    document.getElementById("result").style.display = "none";
    document.getElementById("vehicleInfo").style.display = "none";

    // Sender en asynkron POST-request til backend-endpointet /scan
    // Requesten indeholder billedet som multipart/form-data,
    // så backend (FastAPI) kan modtage og behandle billedfilen
    const response = await fetch("/scan", {
        method: "POST", // Angiver at der sendes data til serveren
        body: formData // Indeholder billedet, som skal OCR-scannes
    });

    // Parse JSON-svar fra server
    const data = await response.json();

    // Skjul loading-tekst og vis resultater
    document.getElementById("loading").style.display = "none";
    document.getElementById("result").style.display = "block";

    // Udfyld felterne med resultater fra ocr
    document.getElementById("plateResult").textContent = data.detected_plate || "Ingen fundet";
    document.getElementById("kmResult").textContent    = data.detected_km || "Ingen fundet";
    document.getElementById("vinResult").textContent   = data.detected_vin || "Ingen fundet";

    // Hent knappen til at søge køretøjsinfo
    const searchBtn = document.getElementById("searchVehicleBtn");

    // Hvis der blev fundet en nummerplade
    if (data.detected_plate) {
        searchBtn.style.display = "inline-block"; // Viser knappen
        searchBtn.setAttribute("data-plate", data.detected_plate); // Gemmer nummerpladen
    } else {
        // Skjuler knappen hvis ingen nummerplade blev fundet
        searchBtn.style.display = "none";
    }
});

// Hent info fra MotorAPI
// Når brugeren klikker "Søg info" efter scanning
document.getElementById("searchVehicleBtn").addEventListener("click", async () => {
    // Hent nummerpladen fra data-plate-attributten
    const plate = document.getElementById("searchVehicleBtn").getAttribute("data-plate");

    // Find boksen hvor info vises
    const infoBox = document.getElementById("vehicleInfo");
    infoBox.style.display = "block";       // Gør det synligt
    infoBox.innerHTML = "⏳ Henter data…"; // Midlertidig tekst

    try {
        // Hent data fra backend-endpoint (/vehicles/:plate)
        const response = await fetch(`/vehicles/${plate}`);

        // Parse JSON-svar fra server
        const data = await response.json();

        const v = data.vehicle; // Køretøjsdata
        const env = data.environment; // Miljødata
        const mot = v.mot_info; // Synsdata (seneste syn)

        // Beregn årgang ud fra model_year eller registrering
        const year = (v.model_year && v.model_year > 0)
            ? v.model_year
            : (v.first_registration ? v.first_registration.substring(0, 4) : "Ukendt");

        // Vis køretøjsinformation, seneste syn og miljø
        infoBox.innerHTML = `
                <h4>Køretøjsoplysninger</h4>
                <div class="vehicle-line"><strong>Registreringsnummer:</strong> ${v.registration_number}</div>
                <div class="vehicle-line"><strong>Status:</strong> ${v.status}</div>
                <div class="vehicle-line"><strong>Type:</strong> ${v.type}</div>
                <div class="vehicle-line"><strong>Anvendelse:</strong> ${v.use}</div>
                <div class="vehicle-line"><strong>Stelnummer (VIN):</strong> ${v.vin}</div>
                <div class="vehicle-line"><strong>Mærke:</strong> ${v.make}</div>
                <div class="vehicle-line"><strong>Model:</strong> ${v.model}</div>
                <div class="vehicle-line"><strong>Variant:</strong> ${v.variant}</div>
                <div class="vehicle-line"><strong>Årgang:</strong> ${year}</div>
                <div class="vehicle-line"><strong>Brændstof:</strong> ${v.fuel_type}</div>
                <div class="vehicle-line"><strong>Motor:</strong> ${v.engine_volume} ccm / ${v.engine_power} hk</div>

                <hr>

                <h4>Seneste syn</h4>
                <div class="vehicle-line"><strong>Dato:</strong> ${mot?.date || "Ukendt"}</div>
                <div class="vehicle-line"><strong>Resultat:</strong> ${mot?.result || "Ukendt"}</div>
                <div class="vehicle-line"><strong>Kilometer ved syn:</strong> ${mot?.mileage || "Ukendt"}</div>

                <hr>

                <h4>Miljø</h4>
                <div class="vehicle-line"><strong>CO₂:</strong> ${env.co2_emission} g/km</div>
                <div class="vehicle-line"><strong>Brændstofforbrug:</strong> ${env.fuel_usage || "Ukendt"} km/l</div>
                <div class="vehicle-line"><strong>Euro-norm:</strong> ${env.euro_norm}</div>
            `;
    } catch (err) {
        // Fejl ved API-kald
        infoBox.innerHTML = "❌ Fejl: Kunne ikke hente data.";
    }
});