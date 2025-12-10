const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registration.controller");

// Public endpoint - no authentication required
router.post("/register-company", registrationController.registerCompany);

module.exports = router;
