const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const grantAllRolesDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // Target roles based on user request and known system roles
    const targetRoleNames = [
      "Project Manager",
      "Intern",
      "Consultant",
      "Accountant",
      "HR",
      "Employee",
      "Admin",
    ];

    console.log(
      `Granting 'documents' module access to roles: ${targetRoleNames.join(
        ", "
      )}`
    );

    const roles = await Role.find({ name: { $in: targetRoleNames } });

    if (roles.length === 0) {
      console.log("No matching roles found.");
      return;
    }

    let updatedCount = 0;
    for (const role of roles) {
      if (!role.accessibleModules.includes("documents")) {
        role.accessibleModules.push("documents");
        await role.save();
        console.log(
          `Updated '${role.name}' role for tenant ${role.tenantId}: Added 'documents'`
        );
        updatedCount++;
      }
    }

    console.log(`\nOperation complete. Updated ${updatedCount} roles.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

grantAllRolesDocuments();
