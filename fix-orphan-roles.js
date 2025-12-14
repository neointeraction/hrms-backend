const mongoose = require("mongoose");
const User = require("./models/User");
const Role = require("./models/Role");
require("dotenv").config();

async function fixOrphanRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const email = "shameer@neointeraction.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("Tenant:", user.tenantId);

    // Find roles with missing tenantId or null
    // We assume all such roles belong to this tenant for now,
    // OR we match by name if we know which ones.
    // Safer: Update legacy roles if they match standard names.
    const rolesToFix = await Role.find({
      tenantId: null,
      name: {
        $in: [
          "Project Manager",
          "Employee",
          "HR",
          "Admin",
          "Intern",
          "Consultant",
          "Accountant",
        ],
      },
    });

    console.log(`Found ${rolesToFix.length} orphan roles.`);

    for (const role of rolesToFix) {
      role.tenantId = user.tenantId;
      await role.save();
      console.log(`Fixed role: ${role.name} (${role._id})`);
    }

    // Also check if there are duplicate roles now (one with tenant, one without)
    // If so, we might need to merge or delete, but user can manage that in UI now.
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixOrphanRoles();
