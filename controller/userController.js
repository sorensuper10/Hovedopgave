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

        // Redirect til login efter succesfuld oprettelse
        return res.redirect("/login.html");

    } catch (err) {
        // Håndter duplikeringsfejl fra unik indeks (Mongo code 11000)
        if (err && err.code === 11000) {
            return res.status(409).send("Brugernavn er allerede i brug.");
        }
        // Log detaljeret fejl i serveren til debugging
        console.error("Fejl under oprettelse:", err);
        // Log detaljeret fejl i serveren til debugging
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
        const { username, password } = req.body || {};
        if (!username || !password)
            return res.status(400).json({ success: false, message: "Missing fields" });

        // Find bruger i databasen
        const user = await User.findOne({ username: username.trim() });
        if (!user)
            return res.status(401).json({ success: false, message: "Wrong username or password" });

        // Sammenlign adgangskoder
        const ok = await bcrypt.compare(password, user.passwordHash);
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
        let { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Manglende felter"
            });
        }

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

        // Opret bruger
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