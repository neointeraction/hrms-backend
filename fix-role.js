const mongoose = require("mongoose");
const User = require("./models/User");
const Role = require("./models/Role");
require("dotenv").config();

async function fixUserRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const email = "shameer@neointeraction.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("Found User:", user.name, "Tenant:", user.tenantId);

    // Find the Role named "Project Manager" belonging to this USER'S tenant
    const correctRole = await Role.findOne({
      name: "Project Manager",
      tenantId: user.tenantId,
    });

    if (!correctRole) {
      console.log("Correct role not found for this tenant");
      return;
    }

    console.log(
      "Found Correct Role:",
      correctRole.name,
      "ID:",
      correctRole._id
    );
    console.log("Role Modules:", correctRole.accessibleModules);

    // Update the user to use this role
    user.roles = [correctRole._id];
    await user.save();

    console.log("User updated successfully to use role:", correctRole._id);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixUserRole();
