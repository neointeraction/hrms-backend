const express = require("express");
const router = express.Router();
const appreciationController = require("../controllers/appreciation.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");

router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

router.post("/", appreciationController.createAppreciation);
router.get("/", appreciationController.getAppreciations);
router.post("/mark-seen", appreciationController.markAsSeen);

module.exports = router;
