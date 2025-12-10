const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

async function checkSuperAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB\n");

    // Find Super Admin
    const superAdmin = await User.findOne({ isSuperAdmin: true });

    if (!superAdmin) {
      console.log("NO SUPER ADMIN FOUND!");
      console.log("\nTo create Super Admin, run:");
      console.log("  node scripts/seed_super_admin.js");
    } else {
      console.log("Super Admin found:");
      console.log("  Email:", superAdmin.email);
      console.log("  Name:", superAdmin.name);
      console.log("  ID:", superAdmin._id);
      console.log("  isSuperAdmin:", superAdmin.isSuperAdmin);
      console.log("  Status:", superAdmin.status);
      console.log("\nLogin with:");
      console.log("  Email:", superAdmin.email);
      console.log("  Password: (check seed script for default password)");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkSuperAdmin();
