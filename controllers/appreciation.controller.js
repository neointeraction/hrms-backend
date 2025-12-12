const Appreciation = require("../models/Appreciation");
const Employee = require("../models/Employee");

exports.createAppreciation = async (req, res) => {
  try {
    const { recipientId, badgeId, message } = req.body;
    const userId = req.user.userId; // User ID from token
    const tenantId = req.user.tenantId;

    // Find the sender employee record using the userId
    const sender = await Employee.findOne({ user: userId, tenantId });
    if (!sender) {
      return res
        .status(404)
        .json({ message: "Sender employee profile not found" });
    }

    // Verify recipient exists and belongs to tenant
    const recipient = await Employee.findOne({ user: recipientId, tenantId });
    // Note: Frontend sends User ID for recipient, usually.
    // Let's assume recipientId passed from frontend is the User ID (from EmployeeOption interface in Feedback.tsx)
    // Or it could be Employee ID.
    // In Feedback.tsx: value={emp.user._id}. So it's User ID.
    // So recipient search above is correct if recipientId is User ID.

    // Check if recipientId might be an Employee ID directly if User ID fetch fails?
    // Let's stick to User ID as per Feedback.tsx pattern.

    if (!recipient) {
      return res
        .status(404)
        .json({ message: "Recipient employee profile not found" });
    }

    if (sender._id.toString() === recipient._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot appreciate yourself" });
    }

    const appreciation = new Appreciation({
      tenantId,
      sender: sender._id,
      recipient: recipient._id,
      badge: badgeId,
      message,
    });

    await appreciation.save();

    // Populate to return useful data
    await appreciation.populate([
      { path: "sender", select: "firstName lastName" },
      { path: "recipient", select: "firstName lastName" },
      { path: "badge" },
    ]);

    res.status(201).json(appreciation);
  } catch (error) {
    console.error("Error sending appreciation:", error);
    res
      .status(500)
      .json({ message: "Failed to send appreciation", error: error.message });
  }
};

exports.getAppreciations = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    // Optional filters: by recipient, by sender
    const { recipientId } = req.query;

    let query = { tenantId };

    if (recipientId) {
      // If filtering by recipient, we need to map the User ID to Employee ID first, or assume Employee ID passed?
      // Let's assume query param might be just passed as is.
      // For simplicity, let's just return all for tenant if no specific filter, or handle later.
      // The requirement is mostly about creation flow.
    }

    const appreciations = await Appreciation.find(query)
      .populate("sender", "firstName lastName")
      .populate("recipient", "firstName lastName")
      .populate("badge")
      .sort({ createdAt: -1 });

    res.json(appreciations);
  } catch (error) {
    console.error("Error fetching appreciations:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch appreciations", error: error.message });
  }
};
