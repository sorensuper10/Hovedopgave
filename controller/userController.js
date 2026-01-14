const bcrypt = require("bcryptjs"); // Importerer bcrypt til sikker hashing af adgangskoder
const User = require("../model/userModel"); // Importerer User-modellen

// Gør funktionen tilgængelig for andre filer via require()
// 'async' gør funktionen asynkron, så serveren kan håndtere andre opgaver,
// mens den venter på fx databasekald eller API-respons
// Opret bruger
exports.postCreateUser = async (req, res) => {
    try {
        // Læser brugernavn og adgangskode fra request body (formular-data)
        let { username, password } = req.body || {};
        // Stop hvis felter mangler
        if (!username || !password) return res.status(400).send("Manglende felter.");

        // Fjerner mellemrum før/efter brugernavn
        username = username.trim();

        // Tjek om brugernavn allerede findes i databasen
        const exists = await User.findOne({ username });
        if (exists) return res.status(409).send("Brugernavn er allerede i brug.");

        // Hasher adgangskoden med bcrypt (10 saltrunder)
        const passwordHash = await bcrypt.hash(password, 10);

        // Opretter brugeren i databasen med hashet adgangskode
        await User.create({ username, passwordHash });

        // Redirect til login efter succesfuld oprettelse
        return res.redirect("/login.html");

    } catch (err) {
        // Håndter duplikeringsfejl fra unik indeks (Mongo code 11000)
        if (err && err.code === 11000) {
            return res.status(409).send("Brugernavn er allerede i brug.");
        }
        // Log detaljeret fejl i serveren til debugging
        console.error("Fejl under oprettelse:", err);
        // Returnér generisk fejlbesked til klienten
        return res.status(500).send("Der opstod en fejl. Prøv igen senere.");
    }
};

// Login
exports.login = async (req, res) => {
    try {
        // Læser login-data fra request body
        const { username, password } = req.body || {};
        // Tjekker om der mangler nogle felter
        if (!username || !password) return res.status(400).send("Manglende felter.");

        // Finder bruger i databasen baseret på brugernavn
        const user = await User.findOne({ username: username.trim() });
        // Hvis brugeren ikke findes
        if (!user) return res.status(401).send("Forkert brugernavn eller adgangskode.");

        // Sammenligner indtastet adgangskode med hash i databasen
        const ok = await bcrypt.compare(password, user.passwordHash);
        // Hvis adgangskode er forkert
        if (!ok) return res.status(401).send("Forkert brugernavn eller adgangskode.");

        // Gemmer brugerens ID og navn i server-side session
        req.session.userId = user._id.toString();
        req.session.username = user.username;

        // Send brugeren til dashboard efter sucessfuld login
        return res.redirect("/dashboard.html");

    } catch (err) {
        // Log detaljeret fejl i serverens konsol til fejlfinding
        console.error("Fejl under login:", err);
        // Send en generel, sikker fejlbesked til klienten
        return res.status(500).send("Noget gik galt. Prøv igen senere.");
    }
};

// Log ud
exports.logout = (req, res) => {
    // Destroy session, ryd cookie og redirect til forsiden
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/index.html");
    });
};


// Login via Android app
exports.appLogin = async (req, res) => {
    try {
        // Læser login-data sendt fra Android-appen
        const { username, password } = req.body || {};
        // Tjekker for manglende felter
        if (!username || !password)
            return res.status(400).json({ success: false, message: "Missing fields" });

        // Find bruger i databasen
        const user = await User.findOne({ username: username.trim() });
        // Hvis bruger ikke findes
        if (!user)
            return res.status(401).json({ success: false, message: "Wrong username or password" });

        // Sammenligner indtastet adgangskode med hash i databasen
        const ok = await bcrypt.compare(password, user.passwordHash);
        // Hvis brugernavn eller adgangskode er forkert
        if (!ok)
            return res.status(401).json({ success: false, message: "Wrong username or password" });
        // Returnér JSON-respons (ingen redirect i app-versionen)
        return res.json({
            success: true,
            username: user.username
        });
    } catch (err) {
        // Log detaljeret fejl i serverens konsol til fejlfinding
        console.error(err);
        // Send en generel, sikker fejlbesked til klienten
        return res.status(500).json({
            success: false,
            message: "Serverfejl, prøv igen senere"
        });
    }
};

// Register til appen (JSON-baseret)
exports.appRegister = async (req, res) => {
    try {
        // Læser brugerdata fra JSON request
        let { username, password } = req.body || {};
        // Tjekker for manglende felter
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Manglende felter"
            });
        }
        // Fjerner mellemrum før/efter brugernavn
        username = username.trim();
        // Tjek om brugernavn allerede findes
        const exists = await User.findOne({ username });
        if (exists) {
            return res.status(409).json({
                success: false,
                message: "Brugernavn er allerede i brug"
            });
        }
        // Hash adgangskode
        const passwordHash = await bcrypt.hash(password, 10);

        // Opretter ny bruger i databasen
        await User.create({ username, passwordHash });

        // Returnér JSON til appen i stedet for redirect
        return res.status(201).json({
            success: true,
            username: username,
            message: "Bruger oprettet"
        });
    } catch (err) {
        // Log detaljeret fejl i serverens konsol til fejlfinding
        console.error("Fejl under appRegister:", err);
        // Send en generel, sikker fejlbesked til klienten
        return res.status(500).json({
            success: false,
            message: "Serverfejl, prøv igen senere"
        });
    }
};