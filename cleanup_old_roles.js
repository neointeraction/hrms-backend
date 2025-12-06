const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const oldRoleNames = [
  "admin",
  "hr",
  "accountant",
  "pm",
  "employee",
  "intern",
  "contractor",
  "consultant", // lowercase version
];

async function cleanupOldRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Delete all old lowercase roles
    const result = await Role.deleteMany({
      name: { $in: oldRoleNames },
    });

    console.log(`Deleted ${result.deletedCount} old roles`);

    // Verify remaining roles
    const remainingRoles = await Role.find();
    console.log("\nRemaining roles in database:");
    remainingRoles.forEach((role) => {
      console.log(`  - ${role.name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

cleanupOldRoles();
