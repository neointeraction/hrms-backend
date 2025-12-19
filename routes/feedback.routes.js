const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const {
  authenticateToken: authenticateUser,
  authorize: authorizeRoles,
} = require("../middleware/auth.middleware");

// Standard Peer Feedback
router.post("/", authenticateUser, feedbackController.createFeedback);
router.get("/my", authenticateUser, feedbackController.getMyFeedbacks);

// Feedback Forms (Surveys)
// Create Form - Admin/HR only
router.post(
  "/forms",
  authenticateUser,
  authorizeRoles(["admin", "hr", "super admin"]),
  feedbackController.createForm
);

// Get Forms - All authenticated users (to view and answer)
// Note: admins might see different view in future (e.g. inactive ones), but for now same.
router.get("/forms", authenticateUser, feedbackController.getForms);

// Update Form
router.put(
  "/forms/:formId",
  authenticateUser,
  authorizeRoles(["admin", "hr", "super admin"]),
  feedbackController.updateForm
);

// Delete Form
router.delete(
  "/forms/:formId",
  authenticateUser,
  authorizeRoles(["admin", "hr", "super admin"]),
  feedbackController.deleteForm
);

// Submit Response
router.post(
  "/forms/submit",
  authenticateUser,
  feedbackController.submitResponse
);

// Get Form Responses - Admin/HR only
router.get(
  "/forms/:formId/responses",
  authenticateUser,
  authorizeRoles([
    "admin",
    "hr",
    "super admin",
    "human resources",
    "hr executive",
  ]),
  feedbackController.getFormResponses
);

module.exports = router;
