// Base URL (lokalt eller online)
const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://hovedopgave.onrender.com";

// Hent billeder fra backend og vis i galleriet
async function loadImages() {
    try {
        const res = await fetch(`${BASE_URL}/images`);
        const data = await res.json();
        const gallery = document.getElementById("imageGallery");
        gallery.innerHTML = "";

        // Hvis ingen billeder findes
        if (!data.success || !data.images.length) {
            gallery.textContent = "Ingen billeder fundet.";
            return;
        }

        // Gennemgå alle billeder og opret visning
        data.images.forEach(img => {
            const div = document.createElement("div");
            div.className = "imageCard";

            // Billedekilde – håndter base64 med eller uden header
            const imgSrc = img.data && img.data.startsWith("data:image")
                ? img.data
                : `data:image/jpeg;base64,${img.data || ""}`;

            // Formatér dato (fx 02-12-2025 kl. 11:45)
            const createdAt = new Date(img.createdAt);
            const formattedDate = createdAt.toLocaleString("da-DK", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            // HTML for hvert billede
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
        console.error("Fejl:", err);
        document.getElementById("imageGallery").textContent = "Kunne ikke hente billeder.";
    }
}

// Åbn popup med stort billede
function openPopup(img) {
    const popup = document.getElementById("popup");
    const popupImg = document.getElementById("popupImage");

    // Håndter både base64-billeder og almindelige
    const imgSrc = img.data && img.data.startsWith("data:image")
        ? img.data
        : `data:image/jpeg;base64,${img.data || ""}`;

    popupImg.src = imgSrc;
    popup.style.display = "flex";
}

// Luk popup
document.getElementById("closePopup").addEventListener("click", () => {
    document.getElementById("popup").style.display = "none";
});

// Tilbage til dashboard (web)
document.getElementById("backBtn").addEventListener("click", () => {
    if (window.AndroidInterface) {
        window.AndroidInterface.goBackToDashboard(); // Android
    } else {
        window.location.href = "dashboard.html"; // Web
    }
});

// Indlæs billeder ved start
loadImages();

/* ============================================
   🖼️ Tilpas logo i Android-app
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
    const logo = document.getElementById("logo");
    if (window.AndroidInterface && logo) {
        logo.style.width = "120px";
        logo.style.height = "auto";
        logo.style.marginTop = "10px";
        logo.style.objectFit = "contain";
    }
});