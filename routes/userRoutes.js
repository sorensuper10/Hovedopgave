// Importér Express frameworket
const express = require("express");

// Importér userController
const userController = require("../controller/userController");

// Opret en ny router-instans til at håndtere brugerrelaterede ruter
const router = express.Router();

/*
 * Denne route bruges af dashboardet til at tjekke, om der findes en aktiv session.
 * Hvis brugeren er logget ind, sendes brugernavn tilbage som JSON.
 * Hvis ikke, returneres en 401-fejl (unauthorized).
 */
router.get("/session", (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ message: "Ikke logget ind" });
    }
});

/*
 * POST-request til /api/users/register
 * Kalder controllerens postCreateUser() for at oprette en ny bruger.
 */
router.post('/register', userController.postCreateUser);

/*
 * POST-request til /api/users/login
 * Kalder controllerens login()-funktion for at validere login og starte en session.
 */
router.post('/login', userController.login);

/*
 * POST-request til /api/users/logout
 * Kalder controllerens logout()-funktion for at slette sessionen og logge brugeren ud.
 */
router.post('/logout', userController.logout);

router.post('/app-login', userController.appLogin);

router.post('/app-register', userController.appRegister);

// Eksportér routeren så den kan bruges i server.js
module.exports = router;