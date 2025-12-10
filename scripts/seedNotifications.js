const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Notification = require("../models/Notification");
const User = require("../models/User");

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB for Seeding");

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    if (users.length === 0) {
      console.log("No users found.");
      process.exit(1);
    }

    const notifications = users.map((user) => ({
      recipient: user._id,
      type: "SYSTEM",
      title: "Welcome to HRMS Notifications",
      message: "This is a test notification to verify the system.",
      read: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
    console.log(`Created ${notifications.length} test notifications.`);

    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
