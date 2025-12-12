const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const auth = require("../middleware/auth.middleware");

router.use(auth.authenticateToken); // Protect all routes

router.post("/", feedbackController.createFeedback);
router.get("/my", feedbackController.getMyFeedbacks);

module.exports = router;
