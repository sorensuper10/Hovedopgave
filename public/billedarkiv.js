// Base URL (lokalt eller online)
const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"             // Hvis vi kører lokalt → brug lokal server
    : "https://hovedopgave.onrender.com"; // Ellers brug online server på Render

// Hent billeder fra backend og vis i galleriet
async function loadImages() {
    try {
        // Hent alle billeder fra backend endpoint /images
        const res = await fetch(`${BASE_URL}/images`);
        // Konverter respons til JSON
        const data = await res.json();
        // Hent elementet, hvor billeder skal vises
        const gallery = document.getElementById("imageGallery");
        gallery.innerHTML = ""; // Ryd tidligere indhold

        // Hvis ingen billeder findes
        if (!data.success || !data.images.length) {
            // Fejlbesked
            gallery.textContent = "Ingen billeder fundet.";
            // Stop funktionen
            return;
        }

        // Gennemgå alle billeder og opret visning i galleriet
        data.images.forEach(img => {
            const div = document.createElement("div"); // Opret container
            div.className = "imageCard"; // CSS-klasse til styling

            // Håndter base64-billeder: med eller uden "data:image" header
            const imgSrc = img.data && img.data.startsWith("data:image")
                ? img.data
                : `data:image/jpeg;base64,${img.data || ""}`;

            // Formatér oprettelsesdato til dansk format
            const createdAt = new Date(img.createdAt);
            const formattedDate = createdAt.toLocaleString("da-DK", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            // HTML for hvert billedekort
            div.innerHTML = `
                <img src="${imgSrc}" alt="${img.filename}">
                <p><strong></strong> ${img.filename}</p>
                <div class="marksBox">${formattedDate}</div>
            `;

            // Klik på billede → åbner popup
            div.addEventListener("click", () => openPopup(img));
            gallery.appendChild(div);
        });

    } catch (err) {
        // Fejl ved hentning af billeder
        console.error("Fejl:", err);
        document.getElementById("imageGallery").textContent = "Kunne ikke hente billeder.";
    }
}

// Åbn popup med stort billede
function openPopup(img) {
    const popup = document.getElementById("popup");  // Popup-container
    const popupImg = document.getElementById("popupImage"); // <img> i popup

    // Håndter både base64-billeder og almindelige
    const imgSrc = img.data && img.data.startsWith("data:image")
        ? img.data
        : `data:image/jpeg;base64,${img.data || ""}`;

    popupImg.src = imgSrc;  // Sæt billedkilde
    popup.style.display = "flex"; // Vis popup
}

// Luk popup
document.getElementById("closePopup").addEventListener("click", () => {
    document.getElementById("popup").style.display = "none";
});

// Tilbage til dashboard (web eller Android)
document.getElementById("backBtn").addEventListener("click", () => {
    if (window.AndroidInterface) {
        window.AndroidInterface.goBackToDashboard(); // Android
    } else {
        window.location.href = "dashboard.html"; // Web
    }
});

// Kald loadImages() når siden åbnes
loadImages();

/* ============================================
   🖼️ Tilpas logo i Android-app
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { // Forsinket for at sikre, at logo findes i DOM
        const logo = document.querySelector(".logo"); // Find logo-element
        if (window.AndroidInterface && logo) {
            // Tilpas størrelse og margin til Android
            logo.style.width = "220px";
            logo.style.height = "120px";
            logo.style.marginTop = "10px";
            logo.style.objectFit = "contain";
        }
    }, 1000); // Vent 1 sekund før ændring
});