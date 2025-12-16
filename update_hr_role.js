const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const updateHrRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // We need to update all roles named 'hr' across all tenants (or specific one if requested, but better global for this request)
    // The user request implies "hr" role generally.
    // Let's find all roles with name "hr" (case insensitive ideally, but system uses "hr")

    const roles = await Role.find({ name: "HR" });

    if (roles.length === 0) {
      console.log("No 'hr' roles found.");
      return;
    }

    for (const role of roles) {
      if (!role.accessibleModules.includes("documents")) {
        role.accessibleModules.push("documents");
        await role.save();
        console.log(
          `Updated HR role for tenant ${role.tenantId}: Added 'documents'`
        );
      } else {
        console.log(
          `HR role for tenant ${role.tenantId} already has 'documents'`
        );
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

updateHrRole();
