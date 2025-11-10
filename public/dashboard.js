// Hent brugernavn fra serverens session
fetch("/api/users/session")
    .then(res => {
        if (!res.ok) throw new Error("Ikke logget ind");
        return res.json();
    })
    .then(data => {
        // Sæt velkomsthilsen med brugernavn
        document.getElementById("welcome").textContent = `Velkommen, ${data.username}!`;
    })
    .catch(() => {
        // Hvis ikke logget ind, send brugeren tilbage til login
        window.location.href = "/login.html";
    });