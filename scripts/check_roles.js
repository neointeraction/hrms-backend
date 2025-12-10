const mongoose = require("mongoose");
const Role = require("../models/Role");
require("dotenv").config();

async function checkRoles() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/test"
    );
    console.log("Connected to MongoDB\n");

    // Get all roles
    const allRoles = await Role.find({});
    console.log("Total roles in database:", allRoles.length, "\n");

    if (allRoles.length === 0) {
      console.log(
        "WARNING: No roles found! This is why the dropdown is empty."
      );
      console.log("\nTo fix this:");
      console.log("1. Register a new company via /signup");
      console.log("2. The registration process creates default roles");
    } else {
      // Group by tenant
      const rolesByTenant = {};
      allRoles.forEach((role) => {
        const tenantKey = role.tenantId
          ? role.tenantId.toString()
          : "NO_TENANT";
        if (!rolesByTenant[tenantKey]) {
          rolesByTenant[tenantKey] = [];
        }
        rolesByTenant[tenantKey].push(role.name);
      });

      console.log("Roles grouped by tenant:");
      Object.keys(rolesByTenant).forEach((tenantId) => {
        console.log("\n  Tenant", tenantId, ":");
        console.log("    Roles:", rolesByTenant[tenantId].join(", "));
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkRoles();
