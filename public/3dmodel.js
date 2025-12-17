/* ============================================
   🧩 Globale variabler og DOM-referencer
   ============================================ */

// --- Generelle variabler ---
let images = [];              // Gemmer alle uploadede billeder som URL’er
let frame = 0;                // Aktuel frame/billede, der vises i vieweren
let zoom = 1;                 // Nuværende zoom-niveau for billedet
let interval = null;          // Interval til automatisk rotation/animation
let initialDistance = 0;      // Startafstand mellem to fingre ved pinch-zoom
let isDragging = false;       // Angiver om musen trækker for rotation
let startX = 0;               // Start X-position når musen begynder at trække

// --- DOM-elementer ---
const viewer = document.getElementById("viewer");            // Container til bil-viewer
const car = document.getElementById("car");                  // <img> element der viser bilen
const canvas = document.getElementById("canvasOverlay");     // Canvas ovenpå billedet til markeringer
const ctx = canvas.getContext("2d");                         // 2D kontekst til tegning på canvas

// --- Markeringer (en liste per billede/frame) ---
let markingEnabled = false;   // Angiver om markeringstilstand er aktiv
let marks = {};               // Objekt med markeringer per frame, fx marks[0] = [{x,y,radius,color}]
let lastTouchTime = 0;        // Tidspunkt for sidste tryk, bruges til dobbeltklik/dobbelttryk

/* ============================================
   🎯 Hjælpefunktioner
   ============================================ */

// Beregn touch-position relativt til canvas
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();           // Hent canvas’ position på siden
    const t = e.touches[0];                                // Første touch-point
    return { x: t.clientX - rect.left, y: t.clientY - rect.top }; // Returner x,y relativt til canvas
}

// Tegn alle cirkler for den aktuelle frame
function drawCircles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);      // Ryd canvas
    const frameCircles = marks[frame] || [];              // Hent cirkler for aktuel frame, eller tom liste
    frameCircles.forEach(c => {                           // Gennemløb alle cirkler
        ctx.beginPath();                                  // Start ny sti
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);     // Tegn cirkel med x,y,radius
        ctx.strokeStyle = c.color;                        // Sæt farve
        ctx.lineWidth = 3;                                // Sæt linjebredde
        ctx.stroke();                                     // Tegn cirklen
    });
}

// Opdater billedet i vieweren
function updateImage() {
    car.src = images[frame];     // Skift <img> kilden til nuværende frame
    drawCircles();               // Tegn markeringer på canvas
}

/* ============================================
   🖱️ Rotation med mus
   ============================================ */

// Start rotation når musen trykkes ned
viewer.addEventListener("mousedown", e => {
    if (markingEnabled) return;   // Stop rotation hvis markering er aktiv
    isDragging = true;            // Musen trækker nu
    startX = e.clientX;           // Gem start X-position
    viewer.style.cursor = "grabbing"; // Skift cursor til "grabbing"
});

// Stop rotation når musen slippes
viewer.addEventListener("mouseup", () => {
    isDragging = false;           // Musen trækker ikke længere
    viewer.style.cursor = "grab"; // Skift cursor tilbage til "grab"
});

// Flyt billedet ved musens bevægelse
viewer.addEventListener("mousemove", e => {
    if (markingEnabled) return;   // Stop hvis markering er aktiv
    if (!isDragging || !images.length) return; // Stop hvis ikke trækker eller ingen billeder

    const delta = e.clientX - startX;            // Beregn forskel fra startposition
    if (Math.abs(delta) > 10) {                  // Kun hvis bevægelsen er stor nok
        frame += delta > 0 ? -1 : 1;            // Skift frame afhængigt af retning
        if (frame < 0) frame = images.length - 1;   // Wrap-around hvis < 0
        if (frame >= images.length) frame = 0;      // Wrap-around hvis >= total
        updateImage();                            // Opdater billedet
        startX = e.clientX;                        // Gem ny startposition
    }
});

/* ============================================
   🔍 Zoom (scroll og dobbeltklik)
   ============================================ */

// Zoom med scroll-hjul
viewer.addEventListener("wheel", e => {
    e.preventDefault();                           // Stop standard scroll
    zoom += e.deltaY < 0 ? 0.1 : -0.1;           // Zoom ind/ud afhængigt af scroll retning
    zoom = Math.min(Math.max(zoom, 1), 3);       // Begræns zoom mellem 1 og 3
    car.style.transform = canvas.style.transform = `scale(${zoom})`; // Skaler billede og canvas
});

// Dobbeltklik nulstiller zoom
viewer.addEventListener("dblclick", () => {
    zoom = 1;                                     // Reset zoom til 1
    car.style.transform = canvas.style.transform = "scale(1)"; // Opdater stil
});

/* ============================================
   📱 Touchrotation + pinchzoom
   ============================================ */

let lastTouchX = 0;                               // Gem sidst kendt touch X

// Start touch
viewer.addEventListener("touchstart", e => {
    if (e.touches.length === 1) lastTouchX = e.touches[0].clientX; // En finger = rotation
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;       // X-difference mellem to fingre
        const dy = e.touches[0].clientY - e.touches[1].clientY;       // Y-difference
        initialDistance = Math.hypot(dx, dy);                          // Beregn startafstand
    }
    e.preventDefault();                                                   // Stop standard scrolling
});

// Flyt touch
viewer.addEventListener("touchmove", e => {
    if (e.touches.length === 1 && !markingEnabled) {                 // En finger = rotation
        const touchX = e.touches[0].clientX;                         // Aktuel touch X
        const delta = touchX - lastTouchX;                            // Bevægelsesdelta
        if (Math.abs(delta) > 10 && images.length) {                  // Hvis stort nok
            frame += delta > 0 ? -1 : 1;                               // Skift frame
            if (frame < 0) frame = images.length - 1;                 // Wrap-around
            if (frame >= images.length) frame = 0;
            updateImage();                                             // Opdater billede
            lastTouchX = touchX;                                       // Gem ny start X
        }
        e.preventDefault();
    }

    if (e.touches.length === 2) {                                      // To fingre = pinch-zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;       // X-difference
        const dy = e.touches[0].clientY - e.touches[1].clientY;       // Y-difference
        const distance = Math.hypot(dx, dy);                           // Beregn afstand
        const scaleChange = distance / initialDistance;               // Beregn skalering
        zoom *= scaleChange;                                           // Opdater zoom
        zoom = Math.min(Math.max(zoom, 1), 3);                         // Begræns zoom
        car.style.transform = canvas.style.transform = `scale(${zoom})`; // Opdater stil
        initialDistance = distance;                                     // Opdater startafstand
        e.preventDefault();
    }
});

/* ============================================
   ✏️ Markeringer (mus + touch)
   ============================================ */

let isMouseDown = false;                     // Om musen trykkes ned
let selectedCircle = null;                   // Den valgte cirkel til flytning

// --- Web (mus) ---
// Klik på canvas
canvas.addEventListener("mousedown", e => {
    if (!markingEnabled) return;             // Stop hvis markering er slået fra
    const rect = canvas.getBoundingClientRect();               // Hent canvas position
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }; // Beregn position
    if (!marks[frame]) marks[frame] = [];                     // Lav array for frame hvis tom
    const frameCircles = marks[frame];                        // Hent frame cirkler

    selectedCircle = frameCircles.find(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius); // Find cirkel under cursor

    const now = Date.now();                                   // Tidspunkt nu
    if (!selectedCircle) {                                    // Hvis ingen cirkel under cursor
        frameCircles.push({ x: pos.x, y: pos.y, radius: 30, color: "red" }); // Tilføj ny markering
        drawCircles();                                        // Tegn cirkler
    } else if (now - lastTouchTime < 400) {                  // Dobbeltklik indenfor 400ms
        frameCircles.splice(frameCircles.indexOf(selectedCircle), 1); // Slet cirkel
        drawCircles();                                        // Tegn cirkler
    }
    lastTouchTime = now;                                      // Gem tidspunkt
    isMouseDown = true;                                       // Musen er trykket ned
});

// Træk mus
canvas.addEventListener("mousemove", e => {
    if (!markingEnabled || !isMouseDown || !selectedCircle) return; // Stop hvis ikke aktivt
    const rect = canvas.getBoundingClientRect();               // Hent canvas position
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }; // Beregn position
    selectedCircle.x = pos.x;                                   // Opdater cirkel X
    selectedCircle.y = pos.y;                                   // Opdater cirkel Y
    drawCircles();                                              // Tegn cirkler
});

// Slip mus
canvas.addEventListener("mouseup", () => {
    isMouseDown = false;                                        // Musen er ikke trykket ned
    selectedCircle = null;                                      // Fjern valgt cirkel
});

// --- Touch (mobil/tablet) ---
// Touch start
canvas.addEventListener("touchstart", e => {
    if (!markingEnabled) return;                                 // Stop hvis ikke aktiv
    e.preventDefault();                                          // Stop standard handling
    const pos = getTouchPos(e);                                  // Beregn touch position

    if (!marks[frame]) marks[frame] = [];                        // Lav array for frame hvis tom
    const frameCircles = marks[frame];                           // Hent frame cirkler
    let dragIndex = frameCircles.findIndex(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius); // Find cirkel under touch
    const now = Date.now();

    if (dragIndex === -1) {                                      // Ingen cirkel
        frameCircles.push({ x: pos.x, y: pos.y, radius: 30, color: "red" }); // Tilføj ny cirkel
    } else if (now - lastTouchTime < 400) {                      // Dobbelttryk
        frameCircles.splice(dragIndex, 1);                       // Slet cirkel
    }
    lastTouchTime = now;                                         // Gem tidspunkt
    drawCircles();                                               // Tegn cirkler
});

// Touch move
canvas.addEventListener("touchmove", e => {
    if (!markingEnabled) return;                                 // Stop hvis ikke aktiv
    e.preventDefault();                                          // Stop standard scroll
    const frameCircles = marks[frame];                           // Hent frame cirkler
    if (!frameCircles) return;                                   // Stop hvis tomt

    const pos = getTouchPos(e);                                  // Beregn touch position
    const dragIndex = frameCircles.findIndex(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius); // Find cirkel
    if (dragIndex !== -1) {                                      // Hvis cirkel fundet
        frameCircles[dragIndex].x = pos.x;                       // Opdater X
        frameCircles[dragIndex].y = pos.y;                       // Opdater Y
        drawCircles();                                           // Tegn cirkler
    }
});

/* ============================================
   🔄 Animation (rotation)
   ============================================ */

const startBtn = document.getElementById("startAnimBtn");       // Start knap
const stopBtn = document.getElementById("stopAnimBtn");         // Stop knap

startBtn.addEventListener("click", () => {                     // Start animation
    if (!images.length) return;                                  // Stop hvis ingen billeder
    startBtn.disabled = true;                                     // Deaktiver start
    stopBtn.disabled = false;                                     // Aktivér stop
    interval = setInterval(() => {                                // Start interval
        frame = (frame + 1) % images.length;                     // Skift frame
        updateImage();                                            // Opdater billede
    }, 300);                                                     // Skift hvert 0.3 sekund
});

stopBtn.addEventListener("click", () => {                      // Stop animation
    clearInterval(interval);                                     // Stop interval
    startBtn.disabled = false;                                    // Aktivér start igen
    stopBtn.disabled = true;                                      // Deaktiver stop
});

/* ============================================
   🧭 Markeringstilstand
   ============================================ */

const toggleBtn = document.getElementById("toggleMarksBtn");   // Knappen til at slå markering til/fra
toggleBtn.addEventListener("click", () => {                   // Klik event
    markingEnabled = !markingEnabled;                           // Skift markeringstilstand
    toggleBtn.textContent = markingEnabled ? "✏️ Markering: Til" : "✏️ Markering: Fra"; // Opdater tekst
});

/* ============================================
   🔙 Tilbage til Dashboard
   ============================================ */

document.getElementById("backBtn").addEventListener("click", () => { // Klik på tilbage
    if (window.AndroidInterface) {                                 // Hvis AndroidInterface findes
        window.AndroidInterface.goBackToDashboard();              // Gå tilbage via Android
    } else {
        window.location.href = "dashboard.html";                   // Gå tilbage på web
    }
});

/* ============================================
   📷 Kamera + filhåndtering
   ============================================ */

// Åbn Android-kameraet (kun WebView)
document.getElementById("cameraBtn").addEventListener("click", () => {
    if (window.AndroidInterface?.openCamera) {                    // Hvis funktionen findes
        window.AndroidInterface.openCamera();                     // Åbn kamera
    } else {
        alert("Kamera-funktion er kun tilgængelig i Android-appen."); // Ellers alert
    }
});

// Skjul "vælg fil" og brug knap i appen
const fileInput = document.getElementById("imageInput");           // Filinput
const selectBtn = document.getElementById("selectFilesBtn");       // Vælg fil knap
const cameraBtn = document.getElementById("cameraBtn");            // Kamera knap

if (window.AndroidInterface) {                                      // Android app
    cameraBtn.style.display = "inline-block";                      // Vis kamera knap
    if (fileInput) fileInput.style.display = "none";               // Skjul fil input
    if (selectBtn && fileInput) selectBtn.addEventListener("click", () => fileInput.click()); // Klik knap åbner filinput
} else {                                                            // Web
    if (selectBtn) selectBtn.style.display = "none";               // Skjul knap
}

// Når brugeren vælger billeder manuelt
document.getElementById("imageInput").addEventListener("change", e => {
    const files = Array.from(e.target.files);                      // Konvertér FileList til array
    if (!files.length) return;                                     // Stop hvis ingen filer

    files.sort((a, b) => a.name.localeCompare(b.name));            // Sortér efter navn
    const newImages = files.map(f => URL.createObjectURL(f));     // Lav midlertidige URL’er
    images.push(...newImages);                                     // Tilføj til images array

    if (images.length === newImages.length) {                      // Første upload
        frame = 0;                                                 // Første frame
        car.src = images[0];                                       // Vis første billede
        viewer.style.display = "block";                             // Vis viewer
        canvas.width = viewer.clientWidth;                          // Tilpas canvas bredde
        canvas.height = viewer.clientHeight;                        // Tilpas canvas højde
        drawCircles();                                              // Tegn markeringer
    } else {                                                        // Flere uploads
        frame = images.length - 1;                                  // Sidste frame
        updateImage();                                              // Opdater billede
    }

    alert("📁 " + newImages.length + " nye billede(r) tilføjet!"); // Alert bruger
});

/* ============================================
   💾 Gem billede med markeringer
   ============================================ */

document.getElementById("saveImageBtn").addEventListener("click", async () => {
    if (!images.length) return alert("Vælg mindst ét billede først!");  // Stop hvis ingen billeder

    try {
        const currentImage = images[frame];            // Hent nuværende frame/billede
        const frameMarks = marks[frame] || [];         // Hent markeringer for frame, eller tom liste

        // 1️⃣ Indlæs billedet i et midlertidigt canvas
        const img = new Image();                       // Opret nyt Image objekt
        img.src = currentImage;                        // Sæt kilde til nuværende billede
        await img.decode();                            // Vent til billedet er indlæst

        const tempCanvas = document.createElement("canvas"); // Opret midlertidigt canvas
        const tempCtx = tempCanvas.getContext("2d");          // 2D kontekst
        tempCanvas.width = img.width;                          // Sæt canvas bredde
        tempCanvas.height = img.height;                        // Sæt canvas højde

        // 2️⃣ Tegn originalbilledet
        tempCtx.drawImage(img, 0, 0, img.width, img.height);  // Tegn billedet fuld størrelse

        // 3️⃣ Tegn markeringer ovenpå
        frameMarks.forEach(m => {                                // Loop gennem alle markeringer
            tempCtx.beginPath();                                 // Start ny sti
            tempCtx.arc(                                        // Tegn cirkel
                m.x * (img.width / canvas.width),               // Skaler X til originalbillede
                m.y * (img.height / canvas.height),             // Skaler Y
                m.radius * (img.width / canvas.width),          // Skaler radius
                0,
                Math.PI * 2
            );
            tempCtx.strokeStyle = m.color || "red";             // Sæt farve
            tempCtx.lineWidth = 4;                               // Sæt linjebredde
            tempCtx.stroke();                                    // Tegn cirkel
        });

        // 4️⃣ Konverter resultatet til base64 (JPEG)
        const finalDataURL = tempCanvas.toDataURL("image/jpeg", 0.9); // Lav JPEG med 90% kvalitet

        // 5️⃣ Gem lokalt (Android / browser)
        if (window.AndroidInterface?.saveImageBase64) {               // Hvis Android funktion findes
            window.AndroidInterface.saveImageBase64(finalDataURL);    // Gem billede på telefonen
            alert("✅ Billedet er gemt lokalt på telefonen!");
        } else {
            const a = document.createElement("a");                    // Opret link
            a.href = finalDataURL;                                     // Sæt href til billedets data
            a.download = "bilbillede_" + Date.now() + ".jpg";         // Sæt filnavn
            document.body.appendChild(a);                              // Tilføj til DOM
            a.click();                                                 // "Klik" for at downloade
            document.body.removeChild(a);                              // Fjern link
            alert("💾 Billedet blev downloadet via browseren!");
        }

        // 6️⃣ Upload færdigt billede til backend
        const payload = {                                             // Lav payload objekt
            filename: "bilbillede_" + Date.now() + ".jpg",           // Filnavn
            data: finalDataURL                                        // Base64 data
        };

        const BASE_URL = window.location.hostname === "localhost"    // Tjek om lokal host
            ? "http://localhost:3000"                                 // Lokal backend
            : "https://hovedopgave.onrender.com";                     // Live backend

        const response = await fetch(`${BASE_URL}/uploadImage`, {    // Send POST-request
            method: "POST",                                          // POST metode
            headers: { "Content-Type": "application/json" },         // JSON headers
            body: JSON.stringify(payload)                             // Send JSON data
        });

        const result = await response.json();                         // Læs svar som JSON

        if (result.success) {                                        // Hvis upload lykkedes
            alert("✅ Billedet med markeringer er gemt både lokalt og i MongoDB!");
        } else {
            alert("⚠️ Kun gemt lokalt (fejl ved upload til MongoDB)."); // Ellers kun lokalt
        }
    } catch (err) {
        console.error("Fejl ved gemning:", err);                     // Log fejl
        alert("Der opstod en fejl under gemning.");                  // Alert bruger
    }
});

/* ============================================
   📲 Modtag nyt billede fra Android-kamera
   ============================================ */

window.addCapturedImage = function (uri) {     // Funktion kaldt fra Android med billed-URI
    if (!uri) return;                          // Stop hvis ingen URI
    if (!images) images = [];                  // Initialiser images array hvis undefined

    images.push(uri);                           // Tilføj nyt billede
    const newFrameIndex = images.length - 1;    // Index for nyt billede
    marks[newFrameIndex] = [];                  // Initialiser tom markering for ny frame

    const img = new Image();                    // Opret nyt Image objekt
    img.onload = function () {                  // Når billedet er indlæst
        frame = newFrameIndex;                  // Skift til ny frame
        car.src = uri;                           // Opdater <img> kilden
        viewer.style.display = "block";         // Vis viewer
        canvas.width = viewer.clientWidth;      // Tilpas canvas bredde
        canvas.height = viewer.clientHeight;    // Tilpas canvas højde
        drawCircles();                           // Tegn markeringer (tomme)
        alert("📷 Nyt billede tilføjet fra kamera!"); // Alert bruger
    };
    img.src = uri;                               // Start loading af billedet
};

/* ============================================
   🖼️ Tilpas logo i Android-app
   ============================================ */

document.addEventListener("DOMContentLoaded", () => { // Når DOM er loadet
    setTimeout(() => {                                // Vent 1 sekund (for sikkerhed)
        const logo = document.querySelector(".logo"); // Find logo element
        if (window.AndroidInterface && logo) {        // Kun Android og logo findes
            logo.style.width = "220px";               // Sæt bredde
            logo.style.height = "120px";              // Sæt højde
            logo.style.marginTop = "10px";            // Tilføj margin
            logo.style.objectFit = "contain";         // Behold proportioner
        }
    }, 1000);                                         // Vent 1 sekund
});