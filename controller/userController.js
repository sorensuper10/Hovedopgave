const bcrypt = require("bcryptjs"); // Hashing af adgangskoder
const User = require("../model/userModel"); // Mongoose-model for brugere

// Opret bruger
exports.postCreateUser = async (req, res) => {
    try {
        // Læs feltværdier fra formular/body
        let { username, password } = req.body || {};
        if (!username || !password) return res.status(400).send("Manglende felter.");

        // Simpel normalisering af brugernavn (trim og ens cases)
        username = username.trim();

        // Tjek om brugernavn allerede findes
        const exists = await User.findOne({ username });
        if (exists) return res.status(409).send("Brugernavn er allerede i brug.");

        // Hash adgangskoden (10 runder er et fint startniveau)
        const passwordHash = await bcrypt.hash(password, 10);

        // Opret bruger i databasen
        await User.create({ username, passwordHash });

        // PRG-pattern: redirect til login efter succesfuld oprettelse
        return res.redirect("/login.html");

    } catch (err) {
        // Håndter duplikeringsfejl fra unik indeks (Mongo code 11000)
        if (err && err.code === 11000) {
            return res.status(409).send("Brugernavn er allerede i brug.");
        }
        console.error("Fejl under oprettelse:", err);
        return res.status(500).send("Der opstod en fejl. Prøv igen senere.");
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).send("Manglende felter.");

        // Find bruger
        const user = await User.findOne({ username: username.trim() });
        if (!user) return res.status(401).send("Forkert brugernavn eller adgangskode.");

        // Sammenlign rå adgangskode med hash
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).send("Forkert brugernavn eller adgangskode.");

        // Gem minimal info i server-side sessionen
        req.session.userId = user._id.toString();
        req.session.username = user.username;

        // Send brugeren til dashboard
        return res.redirect("/dashboard.html");

    } catch (err) {
        console.error("Fejl under login:", err);
        return res.status(500).send("Noget gik galt. Prøv igen senere.");
    }
};

// Log ud
exports.logout = (req, res) => {
    // Destroy session og ryd cookie; redirect til forsiden
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/index.html");
    });
};