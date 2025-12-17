/**
 * Add "attendance" module to Admin and HR roles
 * Run this script to grant attendance module access to Admin and HR roles
 */

const mongoose = require("mongoose");
require("dotenv").config();

const roleSchema = new mongoose.Schema({
  name: String,
  tenantId: mongoose.Schema.Types.ObjectId,
  accessibleModules: [String],
});

const Role = mongoose.model("Role", roleSchema);

async function addAttendanceToRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all Admin and HR roles across all tenants
    const roles = await Role.find({
      name: { $in: ["Admin", "HR"] },
    });

    console.log(`\nFound ${roles.length} Admin/HR roles`);

    let updatedCount = 0;

    for (const role of roles) {
      if (!role.accessibleModules.includes("attendance")) {
        role.accessibleModules.push("attendance");
        await role.save();
        console.log(
          `✓ Added "attendance" to ${role.name} role (Tenant: ${role.tenantId})`
        );
        updatedCount++;
      } else {
        console.log(
          `- ${role.name} role already has "attendance" (Tenant: ${role.tenantId})`
        );
      }
    }

    console.log(`\n✅ Updated ${updatedCount} out of ${roles.length} roles`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

addAttendanceToRoles();
