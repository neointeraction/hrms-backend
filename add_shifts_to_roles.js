const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

async function addShiftsToRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all roles (Admin and HR) across all tenants
    const roles = await Role.find({
      name: { $in: ["Admin", "HR"] },
    });

    console.log(`Found ${roles.length} Admin/HR roles to update`);

    let updatedCount = 0;

    for (const role of roles) {
      // Check if "shifts" is already in accessibleModules
      if (!role.accessibleModules.includes("shifts")) {
        role.accessibleModules.push("shifts");
        await role.save();
        updatedCount++;
        console.log(
          `✓ Added "shifts" to ${role.name} role (Tenant: ${role.tenantId})`
        );
      } else {
        console.log(
          `- "shifts" already exists in ${role.name} role (Tenant: ${role.tenantId})`
        );
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Migration complete!`);
    console.log(`Updated ${updatedCount} out of ${roles.length} roles`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

addShiftsToRoles();
