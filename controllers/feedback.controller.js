const Feedback = require("../models/Feedback");
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
