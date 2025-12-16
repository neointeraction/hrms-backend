const mongoose = require("mongoose");
const Role = require("./models/Role");
require("dotenv").config();

const updateEmployeeRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // "Employee" role (uppercase 'E' based on list_roles output earlier)
    const roles = await Role.find({ name: "Employee" });

    if (roles.length === 0) {
      console.log("No 'Employee' roles found.");
      return;
    }

    for (const role of roles) {
      if (!role.accessibleModules.includes("documents")) {
        role.accessibleModules.push("documents");
        await role.save();
        console.log(
          `Updated Employee role for tenant ${role.tenantId}: Added 'documents'`
        );
      } else {
        console.log(
          `Employee role for tenant ${role.tenantId} already has 'documents'`
        );
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

updateEmployeeRole();
