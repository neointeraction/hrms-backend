const express = require("express");
const router = express.Router();
const locationController = require("../controllers/location.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Apply auth middleware to all routes
router.use(authenticateToken);

// Routes
router.post("/", locationController.createLocation);
// Get location stats
router.get("/stats", locationController.getLocationStats);
// Get all locations
router.get("/", locationController.getLocations);
router.put("/:id", locationController.updateLocation);
router.delete("/:id", locationController.deleteLocation);

module.exports = router;
