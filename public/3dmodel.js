/* ============================================
   🧩 Globale variabler og DOM-referencer
   ============================================ */

// --- Generelle variabler ---
let images = [];              // Gemmer alle uploadede billeder (URL’er)
let frame = 0;                // Aktuel frame (billede, der vises)
let zoom = 1;                 // Zoom-niveau
let interval = null;          // Bruges til automatisk rotation
let initialDistance = 0;      // Til pinch-zoom
let isDragging = false;       // Bruges ved rotation med mus
let startX = 0;               // Startposition for træk med mus

// --- DOM-elementer ---
const viewer = document.getElementById("viewer");
const car = document.getElementById("car");
const canvas = document.getElementById("canvasOverlay");
const ctx = canvas.getContext("2d");

// --- Markeringer (en liste per billede/frame) ---
let markingEnabled = false;   // Angiver om markeringstilstand er aktiv
let marks = {};               // Fx marks[0] = [{x,y,radius,color}, ...]
let lastTouchTime = 0;        // Bruges til dobbeltklik / dobbelttryk

/* ============================================
   🎯 Hjælpefunktioner
   ============================================ */

// Beregn touch-position relativt til canvas
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

// Tegn alle cirkler for den aktuelle frame
function drawCircles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frameCircles = marks[frame] || [];
    frameCircles.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

// Opdater billedet i vieweren
function updateImage() {
    car.src = images[frame];
    drawCircles();
}


/* ============================================
   🖱️ Rotation med mus
   ============================================ */

viewer.addEventListener("mousedown", e => {
    if (markingEnabled) return; // 🚫 Slå rotation fra under markering
    isDragging = true;
    startX = e.clientX;
    viewer.style.cursor = "grabbing";
});

viewer.addEventListener("mouseup", () => {
    isDragging = false;
    viewer.style.cursor = "grab";
});

viewer.addEventListener("mousemove", e => {
    if (markingEnabled) return;
    if (!isDragging || !images.length) return;

    const delta = e.clientX - startX;
    if (Math.abs(delta) > 10) {
        frame += delta > 0 ? -1 : 1;
        if (frame < 0) frame = images.length - 1;
        if (frame >= images.length) frame = 0;
        updateImage();
        startX = e.clientX;
    }
});


/* ============================================
   🔍 Zoom (scroll og dobbeltklik)
   ============================================ */

viewer.addEventListener("wheel", e => {
    e.preventDefault();
    zoom += e.deltaY < 0 ? 0.1 : -0.1;
    zoom = Math.min(Math.max(zoom, 1), 3);
    car.style.transform = canvas.style.transform = `scale(${zoom})`;
});

// Dobbeltklik nulstiller zoom
viewer.addEventListener("dblclick", () => {
    zoom = 1;
    car.style.transform = canvas.style.transform = "scale(1)";
});


/* ============================================
   📱 Touchrotation + pinchzoom
   ============================================ */

let lastTouchX = 0;

viewer.addEventListener("touchstart", e => {
    if (e.touches.length === 1) lastTouchX = e.touches[0].clientX;
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.hypot(dx, dy);
    }
    e.preventDefault();
});

viewer.addEventListener("touchmove", e => {
    // En finger = rotation
    if (e.touches.length === 1 && !markingEnabled) {
        const touchX = e.touches[0].clientX;
        const delta = touchX - lastTouchX;
        if (Math.abs(delta) > 10 && images.length) {
            frame += delta > 0 ? -1 : 1;
            if (frame < 0) frame = images.length - 1;
            if (frame >= images.length) frame = 0;
            updateImage();
            lastTouchX = touchX;
        }
        e.preventDefault();
    }

    // To fingre = pinch-zoom
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const scaleChange = distance / initialDistance;
        zoom *= scaleChange;
        zoom = Math.min(Math.max(zoom, 1), 3);
        car.style.transform = canvas.style.transform = `scale(${zoom})`;
        initialDistance = distance;
        e.preventDefault();
    }
});


/* ============================================
   ✏️ Markeringer (mus + touch)
   ============================================ */

let isMouseDown = false;
let selectedCircle = null;

// --- Web (mus) ---
canvas.addEventListener("mousedown", e => {
    if (!markingEnabled) return;
    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!marks[frame]) marks[frame] = [];
    const frameCircles = marks[frame];

    selectedCircle = frameCircles.find(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius);

    const now = Date.now();
    if (!selectedCircle) {
        frameCircles.push({ x: pos.x, y: pos.y, radius: 30, color: "red" }); // Ny markering
        drawCircles();
    } else if (now - lastTouchTime < 400) {
        frameCircles.splice(frameCircles.indexOf(selectedCircle), 1); // Dobbeltklik = slet
        drawCircles();
    }
    lastTouchTime = now;
    isMouseDown = true;
});

canvas.addEventListener("mousemove", e => {
    if (!markingEnabled || !isMouseDown || !selectedCircle) return;
    const rect = canvas.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    selectedCircle.x = pos.x;
    selectedCircle.y = pos.y;
    drawCircles();
});

canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
    selectedCircle = null;
});

// --- Touch (mobil/tablet) ---
canvas.addEventListener("touchstart", e => {
    if (!markingEnabled) return;
    e.preventDefault();
    const pos = getTouchPos(e);

    if (!marks[frame]) marks[frame] = [];
    const frameCircles = marks[frame];
    let dragIndex = frameCircles.findIndex(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius);
    const now = Date.now();

    if (dragIndex === -1) {
        frameCircles.push({ x: pos.x, y: pos.y, radius: 30, color: "red" });
    } else if (now - lastTouchTime < 400) {
        frameCircles.splice(dragIndex, 1); // Dobbelttryk = slet
    }
    lastTouchTime = now;
    drawCircles();
});

canvas.addEventListener("touchmove", e => {
    if (!markingEnabled) return;
    e.preventDefault();
    const frameCircles = marks[frame];
    if (!frameCircles) return;

    const pos = getTouchPos(e);
    const dragIndex = frameCircles.findIndex(c => Math.hypot(c.x - pos.x, c.y - pos.y) < c.radius);
    if (dragIndex !== -1) {
        frameCircles[dragIndex].x = pos.x;
        frameCircles[dragIndex].y = pos.y;
        drawCircles();
    }
});


/* ============================================
   🔄 Animation (rotation)
   ============================================ */

const startBtn = document.getElementById("startAnimBtn");
const stopBtn = document.getElementById("stopAnimBtn");

startBtn.addEventListener("click", () => {
    if (!images.length) return;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    interval = setInterval(() => {
        frame = (frame + 1) % images.length;
        updateImage();
    }, 300); // Skifter billede hvert 0.3 sekund
});

stopBtn.addEventListener("click", () => {
    clearInterval(interval);
    startBtn.disabled = false;
    stopBtn.disabled = true;
});


/* ============================================
   🧭 Markeringstilstand
   ============================================ */

const toggleBtn = document.getElementById("toggleMarksBtn");
toggleBtn.addEventListener("click", () => {
    markingEnabled = !markingEnabled;
    toggleBtn.textContent = markingEnabled ? "✏️ Markering: Til" : "✏️ Markering: Fra";
});


/* ============================================
   🔙 Tilbage til Dashboard
   ============================================ */

document.getElementById("backBtn").addEventListener("click", () => {
    if (window.AndroidInterface) {
        window.AndroidInterface.goBackToDashboard();
    } else {
        window.location.href = "dashboard.html";
    }
});


/* ============================================
   📷 Kamera + filhåndtering
   ============================================ */

// Åbn Android-kameraet (kun i WebView)
document.getElementById("cameraBtn").addEventListener("click", () => {
    if (window.AndroidInterface?.openCamera) {
        window.AndroidInterface.openCamera();
    } else {
        alert("Kamera-funktion er kun tilgængelig i Android-appen.");
    }
});

// Skjul "vælg fil" og brug knap i appen
const fileInput = document.getElementById("imageInput");
const selectBtn = document.getElementById("selectFilesBtn");
const cameraBtn = document.getElementById("cameraBtn");

if (window.AndroidInterface) {
    // 📱 I Android-appen
    cameraBtn.style.display = "inline-block";
    if (fileInput) fileInput.style.display = "none"; // skjul standard input
    if (selectBtn && fileInput) selectBtn.addEventListener("click", () => fileInput.click());
} else {
    // 🌐 På web
    if (selectBtn) selectBtn.style.display = "none"; // skjul knap helt
}

// Når brugeren vælger billeder manuelt
document.getElementById("imageInput").addEventListener("change", e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Sortér og lav midlertidige URLs
    files.sort((a, b) => a.name.localeCompare(b.name));
    const newImages = files.map(f => URL.createObjectURL(f));
    images.push(...newImages);

    // Hvis første upload → vis første billede
    if (images.length === newImages.length) {
        frame = 0;
        car.src = images[0];
        viewer.style.display = "block";
        canvas.width = viewer.clientWidth;
        canvas.height = viewer.clientHeight;
        drawCircles();
    } else {
        frame = images.length - 1;
        updateImage();
    }

    alert("📁 " + newImages.length + " nye billede(r) tilføjet!");
});


/* ============================================
   💾 Gem billede med markeringer
   ============================================ */

document.getElementById("saveImageBtn").addEventListener("click", async () => {
    if (!images.length) return alert("Vælg mindst ét billede først!");

    try {
        const currentImage = images[frame];
        const frameMarks = marks[frame] || [];

        // 1️⃣ Indlæs billedet i et midlertidigt canvas
        const img = new Image();
        img.src = currentImage;
        await img.decode();

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        // 2️⃣ Tegn originalbilledet
        tempCtx.drawImage(img, 0, 0, img.width, img.height);

        // 3️⃣ Tegn markeringer ovenpå
        frameMarks.forEach(m => {
            tempCtx.beginPath();
            tempCtx.arc(
                m.x * (img.width / canvas.width),
                m.y * (img.height / canvas.height),
                m.radius * (img.width / canvas.width),
                0,
                Math.PI * 2
            );
            tempCtx.strokeStyle = m.color || "red";
            tempCtx.lineWidth = 4;
            tempCtx.stroke();
        });

        // 4️⃣ Konverter resultatet til base64 (JPEG)
        const finalDataURL = tempCanvas.toDataURL("image/jpeg", 0.9);

        // 5️⃣ Gem lokalt (Android / browser)
        if (window.AndroidInterface?.saveImageBase64) {
            window.AndroidInterface.saveImageBase64(finalDataURL);
            alert("✅ Billedet er gemt lokalt på telefonen!");
        } else {
            const a = document.createElement("a");
            a.href = finalDataURL;
            a.download = "bilbillede_" + Date.now() + ".jpg";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("💾 Billedet blev downloadet via browseren!");
        }

        // 6️⃣ Upload færdigt billede til backend
        const payload = {
            filename: "bilbillede_" + Date.now() + ".jpg",
            data: finalDataURL
        };

        const BASE_URL = window.location.hostname === "localhost"
            ? "http://localhost:3000"
            : "https://hovedopgave.onrender.com";

        const response = await fetch(`${BASE_URL}/uploadImage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            alert("✅ Billedet med markeringer er gemt både lokalt og i MongoDB!");
        } else {
            alert("⚠️ Kun gemt lokalt (fejl ved upload til MongoDB).");
        }
    } catch (err) {
        console.error("Fejl ved gemning:", err);
        alert("Der opstod en fejl under gemning.");
    }
});


/* ============================================
   📲 Modtag nyt billede fra Android-kamera
   ============================================ */

window.addCapturedImage = function (uri) {
    if (!uri) return;
    if (!images) images = [];

    images.push(uri);
    const newFrameIndex = images.length - 1;
    marks[newFrameIndex] = [];

    const img = new Image();
    img.onload = function () {
        frame = newFrameIndex;
        car.src = uri;
        viewer.style.display = "block";
        canvas.width = viewer.clientWidth;
        canvas.height = viewer.clientHeight;
        drawCircles();
        alert("📷 Nyt billede tilføjet fra kamera!");
    };
    img.src = uri;
};

/* ============================================
   🖼️ Tilpas logo i Android-app
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
    // Vent lidt for at sikre at logoet findes i DOM'en
    setTimeout(() => {
        const logo = document.getElementById("logo") || document.getElementById("imageLogo");
        if (window.AndroidInterface && logo) {
            // Hvis siden kører i appen → gør logoet mindre
            logo.style.width = "90px";
            logo.style.height = "auto";
            logo.style.marginTop = "5px";
            logo.style.objectFit = "contain";
        }
    }, 1000); // vent 1 sekund for sikkerhed
});