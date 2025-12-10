const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Notification = require("../models/Notification");

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB for Cleanup");

    const result = await Notification.deleteMany({ type: "SYSTEM" });
    console.log(`Deleted ${result.deletedCount} system notifications.`);

    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
