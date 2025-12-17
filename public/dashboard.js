// Hent brugernavn fra serverens session
fetch("/api/users/session")// Sender GET-request til serveren for at få session-data
    .then(res => {
        if (!res.ok) throw new Error("Ikke logget ind"); // Tjekker om response er OK, ellers kastes fejl
        return res.json(); // Konverterer serverens JSON-respons til et JavaScript-objekt
    })
    .then(data => {
        // Sæt velkomsthilsen med brugernavn
        document.getElementById("welcome").textContent = `Velkommen, ${data.username}!`;
    })
    .catch(() => {
        // Hvis ikke logget ind, send brugeren tilbage til login
        window.location.href = "/login.html";
    });