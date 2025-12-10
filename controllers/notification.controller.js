const Notification = require("../models/Notification");

// Helper to create notification internally
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedId,
}) => {
  try {
    console.log(
      `DEBUG: Creating Notification - To: ${recipient}, Type: ${type}`
    );
    const notification = new Notification({
      recipient,
      type,
      title,
      message,
      relatedId,
    });
    await notification.save();
    console.log(`DEBUG: Notification Created: ${notification._id}`);
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
    })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(notifications);
  } catch (error) {
    console.error("DEBUG: getNotifications error:", error);
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
