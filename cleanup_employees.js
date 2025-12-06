const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");
const Role = require("./models/Role");
require("dotenv").config();

async function cleanupEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the super admin user (by role name 'admin' and email pattern)
    const adminUser = await User.findOne({ email: "admin@sys.com" }).populate(
      "roles"
    );

    if (!adminUser) {
      console.log("No super admin found, looking for any admin user...");
      const anyAdmin = await User.findOne().populate("roles");
      if (anyAdmin) {
        console.log(`Found admin: ${anyAdmin.email}`);
      } else {
        console.log("No users found in database!");
        process.exit(0);
      }
    } else {
      console.log(
        `Super admin found: ${adminUser.email} (ID: ${adminUser._id})`
      );
    }

    // Delete all Employee records except those linked to super admin
    const employeeDeleteResult = await Employee.deleteMany({
      user: { $ne: adminUser?._id },
    });
    console.log(
      `Deleted ${employeeDeleteResult.deletedCount} employee records`
    );

    // Delete all User records except super admin
    const userDeleteResult = await User.deleteMany({
      _id: { $ne: adminUser?._id },
    });
    console.log(`Deleted ${userDeleteResult.deletedCount} user records`);

    // Show remaining users
    const remainingUsers = await User.find().populate("roles");
    console.log("\n=== Remaining Users ===");
    remainingUsers.forEach((user) => {
      console.log(
        `- ${user.email} (Roles: ${user.roles.map((r) => r.name).join(", ")})`
      );
    });

    await mongoose.disconnect();
    console.log("\nCleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

cleanupEmployees();
