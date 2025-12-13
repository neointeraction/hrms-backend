const Notification = require("../models/Notification");

// Helper to create notification internally
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedId,
  tenantId, // Add tenantId
}) => {
  try {
    const notification = new Notification({
      recipient,
      type,
      title,
      message,
      relatedId,
      tenantId,
    });
    await notification.save();

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw, just log. Notifications shouldn't break the main flow.
  }
};

// Get notifications for logged in user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.userId,
      tenantId: req.user.tenantId, // Filter by tenant
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // If id is 'all', mark all as read for user
    if (id === "all") {
      await Notification.updateMany(
        { recipient: req.user.userId, read: false },
        { read: true }
      );
      return res.json({ message: "All notifications marked as read" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export internal helper
exports.createNotification = createNotification;
