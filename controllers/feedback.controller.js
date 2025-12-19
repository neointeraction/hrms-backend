const Feedback = require("../models/Feedback");
const FeedbackForm = require("../models/FeedbackForm");
const FeedbackResponse = require("../models/FeedbackResponse");
const User = require("../models/User");
const { createNotification } = require("./notification.controller");

// Create new feedback
exports.createFeedback = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const senderId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context missing" });
    }

    if (!recipientId || !message) {
      return res
        .status(400)
        .json({ message: "Recipient and message are required" });
    }

    if (recipientId === senderId) {
      return res
        .status(400)
        .json({ message: "You cannot send feedback to yourself" });
    }

    // specific check: Verify recipient exists in same tenant
    const recipient = await User.findOne({ _id: recipientId, tenantId });
    if (!recipient) {
      return res
        .status(404)
        .json({ message: "Recipient not found in your organization" });
    }

    const feedback = new Feedback({
      sender: senderId,
      recipient: recipientId,
      message,
      tenantId,
    });

    await feedback.save();

    // Notify Recipient
    await createNotification({
      recipient: recipientId,
      type: "FEEDBACK",
      title: "New Feedback Received",
      message: "You have received new feedback from a colleague.",
      relatedId: feedback._id,
      tenantId,
    });

    res.status(201).json({ message: "Feedback sent successfully", feedback });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get feedbacks received by current user
exports.getMyFeedbacks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context missing" });
    }

    const feedbacks = await Feedback.find({ recipient: userId, tenantId })
      .populate("sender", "name email") // Don't expose roles/sensitive info
      .sort({ createdAt: -1 })
      .limit(20); // Limit to recent 20 for dashboard widget

    res.json(feedbacks);
  } catch (error) {
    console.error("Get my feedbacks error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Feedback Forms (Surveys) ---

// Create a new Feedback Form
exports.createForm = async (req, res) => {
  try {
    const { title, description, questions, assignedTo } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    if (!tenantId)
      return res.status(400).json({ message: "Tenant context missing" });

    // Basic validation
    if (!title || !questions || !Array.isArray(questions)) {
      return res
        .status(400)
        .json({ message: "Title and questions list are required" });
    }

    const form = new FeedbackForm({
      title,
      description,
      questions,
      assignedTo: assignedTo || "all",
      createdBy: userId,
      tenantId,
    });

    await form.save();
    res
      .status(201)
      .json({ message: "Feedback form created successfully", form });
  } catch (error) {
    console.error("Create form error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Forms
exports.getForms = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    // const userId = req.user.userId; // If we implement specific assignment later

    // For now, fetch all active forms for the tenant
    // We could filter by assignedTo here if we had groups
    const forms = await FeedbackForm.find({ tenantId, isActive: true }).sort({
      createdAt: -1,
    });

    res.json(forms);
  } catch (error) {
    console.error("Get forms error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Form
exports.updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { title, description, questions, assignedTo } = req.body;
    const tenantId = req.user.tenantId;

    if (!formId) {
      return res.status(400).json({ message: "Form ID is required" });
    }

    const form = await FeedbackForm.findOne({ _id: formId, tenantId });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (title) form.title = title;
    if (description !== undefined) form.description = description;
    if (questions) form.questions = questions;
    if (assignedTo) form.assignedTo = assignedTo;

    // Logic to prevent editing questions if responses already exist?
    // For now, allowing edits but adding a warning via frontend might be better.
    // Simplifying: just update.

    await form.save();
    res.json({ message: "Form updated successfully", form });
  } catch (error) {
    console.error("Update form error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Form (Soft Delete)
exports.deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const tenantId = req.user.tenantId;

    if (!formId) {
      return res.status(400).json({ message: "Form ID is required" });
    }

    const form = await FeedbackForm.findOne({ _id: formId, tenantId });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Soft delete
    form.isActive = false;
    await form.save();

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    console.error("Delete form error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Submit Response
exports.submitResponse = async (req, res) => {
  try {
    const { formId, answers, targetUserId } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    if (!formId || !answers) {
      return res
        .status(400)
        .json({ message: "Form ID and answers are required" });
    }

    // Optional: Check if already submitted? form settings dependent.
    // Assuming multiple submissions allowed for now (e.g. peer reviewing different people)
    // If targetUserId is provided, maybe check uniqueness for that pair.

    const response = new FeedbackResponse({
      formId,
      respondent: userId,
      targetUser: targetUserId || null,
      answers,
      tenantId,
    });

    await response.save();

    res
      .status(201)
      .json({ message: "Response submitted successfully", response });
  } catch (error) {
    console.error("Submit response error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Get Responses for a Form
exports.getFormResponses = async (req, res) => {
  try {
    const { formId } = req.params;
    const tenantId = req.user.tenantId;

    if (!formId) {
      return res.status(400).json({ message: "Form ID is required" });
    }

    const responses = await FeedbackResponse.find({ formId, tenantId })
      .populate("respondent", "name email")
      .populate("targetUser", "firstName lastName email") // specific to Employee model usually
      .sort({ createdAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error("Get form responses error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
