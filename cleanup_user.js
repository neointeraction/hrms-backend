const mongoose = require("mongoose");
const User = require("./models/User");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const emailToDelete = "sindhu@neointeraction.com"; // Replace with the conflicting email if different, inferred from context or general fix

const cleanUpUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Find and delete user(s) with the email
    // Note: We might want to be careful if we have many, but failure suggests one exists.
    // We'll prompt user to edit this script or pass args, but a hardcoded one for the likely culprit is faster.
    // Actually, better to take email from arg.
    const email = process.argv[2];

    if (!email) {
      console.log(
        "Please provide an email address to delete: node cleanup_user.js <email>"
      );
      process.exit(1);
    }

    const result = await User.deleteMany({ email: email });
    console.log(`Deleted ${result.deletedCount} user(s) with email: ${email}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

cleanUpUser();
